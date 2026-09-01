const service = require("../services/IncomeService");
const Income = require("../models/Income");
const MemberIncomeContributions = require("../models/MemberIncomeContribution");
const Transactions = require("../models/Transaction");
const UserClubs = require("../models/UserClub");
const Notification = require("../models/Notification");
const { INCOME_SOURCE } = require("../constrant/schema");
const { getAccess } = require("../utils/clubAuth");

// UC51 actors: Chairman + Department Leader manage income.
const requireIncomeManager = async (userId, clubId) => {
  const access = await getAccess(userId, clubId);
  return access.isChairman || access.isDeptLead;
};

// UC51 — create an income source. "Phí thành viên" auto-generates one
// contribution invoice per ACTIVE member (amount = total / memberCount,
// mirrors the old system's insertIncome); other sources marked "Đã nhận"
// post a single Approved ledger transaction directly instead.
const create = async (req, res) => {
  try {
    const { club, term, source, amount, incomeDate, description, dueDate } = req.body;

    if (!club) return res.status(400).json({ error: "Thiếu thông tin câu lạc bộ." });
    if (!(await requireIncomeManager(req.user.id, club))) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm hoặc Trưởng ban mới có quyền quản lý nguồn thu." });
    }
    if (!source || !INCOME_SOURCE.includes(source)) {
      return res.status(400).json({ error: "Loại nguồn thu không hợp lệ." });
    }
    const numAmount = parseFloat(String(amount));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Số tiền phải lớn hơn 0." });
    }
    if (!incomeDate || isNaN(new Date(incomeDate).getTime())) {
      return res.status(400).json({ error: "Ngày thu không hợp lệ." });
    }
    // Mô tả bắt buộc cho mọi loại nguồn thu.
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập mô tả nguồn thu." });
    }
    // Nguồn phi-phí (Tài trợ / Doanh thu sự kiện / Khác) bắt buộc link minh
    // chứng (hợp đồng tài trợ, biên nhận...) dạng Google Docs/Sheets/Drive.
    if (source !== "Phí thành viên") {
      const attachment = req.body.attachment;
      if (!attachment || !attachment.trim()) {
        return res.status(400).json({ error: "Vui lòng nhập link minh chứng." });
      }
      if (!/^https:\/\/(docs|drive|sheets)\.google\.com\//.test(attachment.trim())) {
        return res.status(400).json({ error: "Link minh chứng phải là Google Docs/Sheets/Drive (https://docs.google.com/...)." });
      }
    }

    if (source === "Phí thành viên") {
      if (!dueDate || isNaN(new Date(dueDate).getTime())) {
        return res.status(400).json({ error: "Vui lòng chọn hạn nộp phí cho thành viên." });
      }

      const members = await UserClubs.find({ club, isActive: true });
      if (members.length === 0) {
        return res.status(400).json({ error: "Câu lạc bộ chưa có thành viên hoạt động để thu phí." });
      }

      const income = await service.createOne({
        club, term, source, amount: numAmount, incomeDate, description,
        dueDate, status: "Đang chờ", createdBy: req.user.id,
      });

      // Per-member amount, VND has no decimals — round to whole dong.
      const perMember = Math.round(numAmount / members.length);
      const contributions = await MemberIncomeContributions.insertMany(
        members.map((m) => ({
          income: income._id,
          user: m.user,
          club,
          term,
          amount: perMember,
          status: "Pending",
          dueDate,
        })),
      );

      return res.status(201).json({
        message: `Đã tạo khoản thu phí và ${contributions.length} hóa đơn cho thành viên.`,
        data: { income, contributionCount: contributions.length },
      });
    }

    // Non-fee source (Tài trợ / Doanh thu sự kiện / Khác) — attachment holds
    // the evidence link (e.g. sponsorship contract).
    const received = req.body.status === "Đã nhận";
    const income = await service.createOne({
      club, term, source, amount: numAmount, incomeDate, description,
      attachment: req.body.attachment, dueDate,
      status: received ? "Đã nhận" : "Đang chờ", createdBy: req.user.id,
    });

    if (received) {
      await Transactions.create({
        club, term, type: "Income", amount: numAmount,
        transactionDate: new Date(incomeDate), description: description || source,
        attachment: req.body.attachment,
        createdBy: req.user.id, status: "Approved",
      });
    }

    res.status(201).json({ message: "Đã tạo nguồn thu.", data: { income } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.club) filter.club = req.query.club;
    if (req.query.source) filter.source = req.query.source;
    const items = await service.getAll(filter);

    // Gắn tiến độ đóng phí (đã đóng / tổng) cho nguồn "Phí thành viên" bằng
    // 1 aggregation duy nhất — để danh sách hiển thị "Đã nhận" khi tất cả
    // thành viên đã đóng, không phải gọi thêm API cho từng dòng.
    const feeIncomeIds = items
      .filter((i) => i.source === "Phí thành viên")
      .map((i) => i._id);

    let statsByIncome = {};
    if (feeIncomeIds.length > 0) {
      const agg = await MemberIncomeContributions.aggregate([
        { $match: { income: { $in: feeIncomeIds } } },
        {
          $group: {
            _id: "$income",
            total: { $sum: 1 },
            paid: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] } },
          },
        },
      ]);
      statsByIncome = Object.fromEntries(
        agg.map((a) => [a._id.toString(), { total: a.total, paid: a.paid }]),
      );
    }

    const data = items.map((i) => {
      const obj = i.toObject ? i.toObject() : i;
      const s = statsByIncome[i._id.toString()];
      if (s) {
        obj.paidCount = s.paid;
        obj.totalCount = s.total;
      }
      return obj;
    });

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC51 screen 2 — per-member Paid/Unpaid detail of one income source.
const getContributions = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ error: "Not found" });
    if (!(await requireIncomeManager(req.user.id, income.club))) {
      return res.status(403).json({ error: "Bạn không có quyền xem danh sách đóng phí." });
    }

    const items = await MemberIncomeContributions.find({ income: income._id })
      .populate("user", "fullName email userId")
      .populate("confirmedBy", "fullName")
      .sort({ status: -1, createdAt: 1 });
    res.status(200).json({ data: { income, contributions: items } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC50 — the member's own invoices ("My Bills").
const getMyContributions = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.club) filter.club = req.query.club;
    if (req.query.status) filter.status = req.query.status;
    const items = await MemberIncomeContributions.find(filter)
      .populate("income", "source description dueDate")
      .populate("club", "clubName")
      .populate("term", "termName")
      .populate("confirmedBy", "fullName")
      .populate("transaction", "paymentMethod referenceCode status")
      .sort({ createdAt: -1 });
    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC51 "Remind All" — in-app notification to every member still Pending.
// Server-side gated (the old system's JSP-only disabled-button was
// bypassable): locked income or nothing Pending → 400, no silent no-op.
const remindAll = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ error: "Not found" });
    if (!(await requireIncomeManager(req.user.id, income.club))) {
      return res.status(403).json({ error: "Bạn không có quyền gửi nhắc nhở." });
    }
    if (income.isLocked) {
      return res.status(400).json({ error: "Khoản thu đã hoàn thành, không thể gửi nhắc nhở." });
    }

    const pending = await MemberIncomeContributions.find({ income: income._id, status: "Pending" });
    if (pending.length === 0) {
      return res.status(400).json({ error: "Không còn thành viên nào chưa đóng phí." });
    }

    const dueText = income.dueDate
      ? ` trước hạn ${new Date(income.dueDate).toLocaleDateString("vi-VN")}`
      : "";
    await Notification.insertMany(
      pending.map((c) => ({
        sender: req.user.id,
        receiver: c.user,
        title: "Nhắc nhở đóng phí thành viên",
        content: `Bạn còn khoản phí ${parseFloat(c.amount.toString()).toLocaleString("vi-VN")}đ chưa đóng${dueText}. Vui lòng thanh toán sớm.`,
        priority: "HIGH",
        status: "UNREAD",
      })),
    );

    res.status(200).json({ message: `Đã gửi nhắc nhở tới ${pending.length} thành viên chưa đóng phí.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC51 BR-01 — manual cash confirmation: flips the contribution to Paid,
// records WHO confirmed it, and posts an Approved Income transaction.
// Pending-only guard prevents double-posting.
const markReceived = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ error: "Not found" });
    if (!(await requireIncomeManager(req.user.id, income.club))) {
      return res.status(403).json({ error: "Bạn không có quyền xác nhận thanh toán." });
    }
    if (income.isLocked) {
      return res.status(400).json({ error: "Khoản thu đã hoàn thành, không thể xác nhận thêm." });
    }
    // Đồng bộ với chặn thanh toán online (PaymentController.createPayment):
    // quá hạn là khóa hẳn MỌI đường ghi nhận đóng phí, kể cả xác nhận tiền
    // mặt thủ công — 1 quy tắc duy nhất, dễ giải thích: muốn thu tiếp thì
    // phải Gia hạn trước (extendDeadline), không có ngoại lệ riêng cho tiền mặt.
    if (income.dueDate && new Date(income.dueDate) < new Date()) {
      return res.status(400).json({ error: "Khoản thu đã quá hạn nộp. Vui lòng Gia hạn trước khi xác nhận thêm." });
    }

    const contribution = await MemberIncomeContributions.findOneAndUpdate(
      { _id: req.params.contributionId, income: income._id, status: "Pending" },
      { status: "Paid", paidDate: new Date(), confirmedBy: req.user.id },
      { new: true },
    );
    if (!contribution) {
      return res.status(400).json({ error: "Hóa đơn không tồn tại hoặc đã được thanh toán." });
    }

    const tx = await Transactions.create({
      club: income.club,
      term: income.term,
      type: "Income",
      amount: contribution.amount,
      transactionDate: new Date(),
      description: `Thu phí thành viên (tiền mặt)${income.description ? ` - ${income.description}` : ""}`,
      createdBy: req.user.id,
      status: "Approved",
      paymentMethod: "Cash",
      memberIncomeContribution: contribution._id,
    });
    await MemberIncomeContributions.updateOne(
      { _id: contribution._id },
      { transaction: tx._id },
    );

    res.status(200).json({ message: "Đã xác nhận thành viên nộp phí (tiền mặt).", data: contribution });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Hoàn tiền một hóa đơn ĐÃ ĐÓNG: đảo ngược giao dịch đã ghi vào sổ cái
// (Approved → Rejected → tiền rời khỏi quỹ) và đưa hóa đơn về "Chưa đóng".
// Dùng khi một thành viên lỡ nộp nhưng cần hủy/xóa cả đợt thu phí (remove
// bị chặn nếu còn hóa đơn Paid). Số dư chỉ tính giao dịch Approved nên việc
// reject giao dịch cũ tự động trừ đúng số tiền đã cộng.
const refund = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ error: "Not found" });
    if (!(await requireIncomeManager(req.user.id, income.club))) {
      return res.status(403).json({ error: "Bạn không có quyền hoàn tiền." });
    }
    if (income.isLocked) {
      return res.status(400).json({ error: "Khoản thu đã hoàn thành, không thể hoàn tiền." });
    }

    const contribution = await MemberIncomeContributions.findOne({
      _id: req.params.contributionId,
      income: income._id,
      status: "Paid",
    });
    if (!contribution) {
      return res.status(400).json({ error: "Hóa đơn không tồn tại hoặc chưa được thanh toán." });
    }

    // Đảo ngược giao dịch đã ghi (chỉ Approved mới đang được cộng vào quỹ).
    if (contribution.transaction) {
      await Transactions.updateOne(
        { _id: contribution.transaction, status: "Approved" },
        { status: "Rejected" },
      );
    }

    // Đưa hóa đơn về trạng thái chưa đóng.
    contribution.status = "Pending";
    contribution.paidDate = null;
    contribution.confirmedBy = null;
    contribution.transaction = null;
    await contribution.save();

    res.status(200).json({ message: "Đã hoàn tiền cho thành viên và trừ khỏi quỹ." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC51 BR-02 — "Complete" locks the income source: auto-rejects lingering
// Pending PAYOS transactions tied to it, blocks further remind/markReceived.
const complete = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ error: "Not found" });
    if (!(await requireIncomeManager(req.user.id, income.club))) {
      return res.status(403).json({ error: "Bạn không có quyền hoàn thành khoản thu." });
    }
    if (income.isLocked) {
      return res.status(400).json({ error: "Khoản thu này đã được hoàn thành trước đó." });
    }
    // "Phí thành viên" chỉ được Hoàn thành khi TẤT CẢ thành viên đã đóng đủ —
    // khóa hẳn một đợt thu khi còn người chưa đóng là không có đường thu lại
    // (Hoàn thành tắt cả nhắc nhở lẫn xác nhận tiền mặt). Không áp dụng cho
    // nguồn phi-phí (Tài trợ/...) — "Hoàn thành" ở đó nghĩa là "xác nhận đã
    // nhận tiền", không có khái niệm thu theo từng thành viên.
    if (income.source === "Phí thành viên") {
      const totalCount = await MemberIncomeContributions.countDocuments({ income: income._id });
      const paidCount = await MemberIncomeContributions.countDocuments({
        income: income._id,
        status: "Paid",
      });
      if (paidCount < totalCount) {
        return res.status(400).json({ error: `Còn ${totalCount - paidCount} thành viên chưa đóng phí, không thể hoàn thành khoản thu này.` });
      }
    }

    // Auto-reject lingering Pending online-payment transactions tied to
    // this income's contributions (UC51 BR-02).
    const contributionIds = await MemberIncomeContributions.find({ income: income._id }).distinct("_id");
    const rejected = await Transactions.updateMany(
      {
        memberIncomeContribution: { $in: contributionIds },
        status: "Pending",
        paymentMethod: "PAYOS",
      },
      { status: "Rejected" },
    );

    // Non-fee source (Tài trợ / Doanh thu sự kiện / Khác) completed while
    // still "Đang chờ": the money has now actually arrived — post its single
    // Approved ledger row here, otherwise a pledged sponsorship could never
    // reach the balance. (Fee sources enter the ledger per-contribution.)
    if (income.source !== "Phí thành viên" && income.status === "Đang chờ") {
      await Transactions.create({
        club: income.club,
        term: income.term,
        type: "Income",
        amount: income.amount,
        transactionDate: new Date(),
        description: income.description || income.source,
        attachment: income.attachment,
        createdBy: req.user.id,
        status: "Approved",
      });
    }

    await Income.updateOne(
      { _id: income._id },
      {
        isLocked: true,
        status: "Đã nhận",
        completedBy: req.user.id,
        completedAt: new Date(),
      },
    );

    res.status(200).json({
      message: `Đã hoàn thành và khóa khoản thu.${rejected.modifiedCount ? ` ${rejected.modifiedCount} giao dịch online đang chờ đã bị hủy.` : ""}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Content edits after creation would desync the already-generated
// contribution invoices — updates are not offered in the new scope.
const update = async (req, res) => {
  return res.status(400).json({
    error: "Nguồn thu đã tạo không thể chỉnh sửa. Dùng chức năng Hoàn thành để khóa, hoặc xóa khi chưa có ai nộp.",
  });
};

// Extend the collection deadline of a "Phí thành viên" income source. This
// is the ONLY field the club leader may still change after creation — a
// deliberately narrow escape hatch for "created the due date too tight" /
// "members need more time", not a general edit. Pushing dueDate into the
// future also transparently reopens online payment (createPayment's overdue
// gate in PaymentController re-checks income.dueDate live on every call —
// nothing needs to change on the individual contributions themselves).
const extendDeadline = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ error: "Not found" });
    if (!(await requireIncomeManager(req.user.id, income.club))) {
      return res.status(403).json({ error: "Bạn không có quyền gia hạn khoản thu này." });
    }
    if (income.source !== "Phí thành viên") {
      return res.status(400).json({ error: "Chỉ nguồn thu Phí thành viên mới có hạn nộp để gia hạn." });
    }
    if (income.isLocked) {
      return res.status(400).json({ error: "Khoản thu đã hoàn thành, không thể gia hạn." });
    }
    const { dueDate } = req.body;
    if (!dueDate) {
      return res.status(400).json({ error: "Vui lòng chọn hạn nộp mới." });
    }
    const newDue = new Date(dueDate);
    if (isNaN(newDue.getTime())) {
      return res.status(400).json({ error: "Hạn nộp mới không hợp lệ." });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDue < today) {
      return res.status(400).json({ error: "Hạn nộp mới không được ở trong quá khứ." });
    }

    income.dueDate = newDue;
    await income.save();
    res.status(200).json({ message: "Đã gia hạn khoản thu. Thành viên có thể thanh toán trở lại.", data: income });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete only while nothing has been paid — otherwise the audit trail
// (paid contributions + ledger rows) must be preserved.
const remove = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ error: "Not found" });
    if (!(await requireIncomeManager(req.user.id, income.club))) {
      return res.status(403).json({ error: "Bạn không có quyền xóa nguồn thu." });
    }
    if (income.isLocked) {
      return res.status(400).json({ error: "Khoản thu đã hoàn thành, không thể xóa." });
    }
    // Quá hạn nộp thì không cho xóa lặng lẽ — Chủ nhiệm/Trưởng ban phải Gia
    // hạn (mở lại) hoặc Hoàn thành trước, để khoản thu từng công bố hạn nộp
    // không biến mất mà không có dấu vết cho thành viên đang chờ đóng.
    if (
      income.source === "Phí thành viên" &&
      income.dueDate &&
      new Date(income.dueDate) < new Date()
    ) {
      return res.status(400).json({ error: "Khoản thu đã quá hạn nộp, không thể xóa. Hãy Gia hạn hoặc Hoàn thành trước." });
    }

    const paidCount = await MemberIncomeContributions.countDocuments({
      income: income._id,
      status: "Paid",
    });
    if (paidCount > 0) {
      return res.status(400).json({ error: "Đã có thành viên nộp phí, không thể xóa khoản thu này." });
    }

    await MemberIncomeContributions.deleteMany({ income: income._id });
    await Income.deleteOne({ _id: income._id });
    res.status(200).json({ message: "Đã xóa nguồn thu và các hóa đơn chưa thanh toán." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  getContributions,
  getMyContributions,
  remindAll,
  markReceived,
  refund,
  complete,
  extendDeadline,
  update,
  remove,
};
