const service = require("../services/ExpenseService");
const Users = require("../models/User");
const Notification = require("../models/Notification");
const UserClubs = require("../models/UserClub");
const Transactions = require("../models/Transaction");
const { EXPENSE_PURPOSE } = require("../constrant/schema");
const { getAccess } = require("../utils/clubAuth");
const { computeClubBalance } = require("../utils/balance");

// UC53 BR-01 — proof link is MANDATORY (upgraded from optional in the old
// system) and must be a Google Docs/Sheets/Drive URL.
const GOOGLE_LINK_PATTERN = /^https:\/\/(docs|drive|sheets)\.google\.com\//;

// UC53 — a spending request is submitted by a Trưởng ban of the club (the
// old system's hardcoded "Ban Hậu cần"-only rule is deliberately dropped:
// WDP301 departments are free-form per club, and the new SRS assigns
// submission to department leaders generally).
const create = async (req, res) => {
  try {
    const { club, term, purpose, amount, expenseDate, description, attachment } = req.body;

    if (!club) {
      return res.status(400).json({ error: "Thiếu thông tin câu lạc bộ." });
    }
    // Strictly Trưởng ban (UC53 actor) — the Chairman is the approver
    // (UC52) and must not be able to submit-and-self-approve.
    const access = await getAccess(req.user.id, club);
    if (!access.isDeptLead) {
      return res.status(403).json({ error: "Chỉ Trưởng ban mới có quyền gửi yêu cầu chi tiêu." });
    }

    if (!purpose) {
      return res.status(400).json({ error: "Mục đích không được để trống." });
    }
    if (!EXPENSE_PURPOSE.includes(purpose)) {
      return res.status(400).json({ error: "Mục đích không hợp lệ." });
    }
    const numAmount = parseFloat(String(amount));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Số tiền phải lớn hơn 0." });
    }
    if (!expenseDate || isNaN(new Date(expenseDate).getTime())) {
      return res.status(400).json({ error: "Ngày chi tiêu không hợp lệ." });
    }
    if (!attachment || !attachment.trim()) {
      return res.status(400).json({ error: "Vui lòng đính kèm link minh chứng (Google Docs/Sheets/Drive)." });
    }
    if (!GOOGLE_LINK_PATTERN.test(attachment.trim())) {
      return res.status(400).json({ error: "Link minh chứng không hợp lệ. Vui lòng dùng link Google Docs/Sheets/Drive (https://docs.google.com/...)." });
    }

    // Identity comes from the authenticated session, never from the body.
    const item = await service.createOne({
      club,
      term,
      purpose,
      amount: numAmount,
      expenseDate,
      description,
      attachment: attachment.trim(),
      createdBy: req.user.id,
      status: "Pending",
    });

    // Notify the club's Chairman (approval authority per UC52 — replaces the
    // old system's "Ban Đối ngoại leader" receiver).
    try {
      const chairman = await UserClubs.findOne({ club, role: "Chủ nhiệm", isActive: true });
      if (chairman) {
        await Notification.create({
          sender: req.user.id,
          receiver: chairman.user,
          title: "Đơn yêu cầu chi tiêu mới",
          content: `${req.user.fullName || "Một trưởng ban"} vừa gửi yêu cầu chi tiêu${description ? ` (${description})` : ""}. Vui lòng xem xét và duyệt.`,
          priority: "HIGH",
          status: "UNREAD",
        });
      }
    } catch (notiError) {
      console.error("Error sending notification:", notiError);
    }

    res.status(201).json({ message: "Đã gửi yêu cầu chi tiêu. Vui lòng chờ Chủ nhiệm phê duyệt.", data: item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.club) filter.club = req.query.club;
    if (req.query.status) filter.status = req.query.status;
    const items = await service.getAll(filter);
    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC53 — the requester's own submission history.
const getMine = async (req, res) => {
  try {
    const filter = { createdBy: req.user.id };
    if (req.query.club) filter.club = req.query.club;
    if (req.query.status) filter.status = req.query.status;
    const items = await service.getAll(filter);
    res.status(200).json({ data: items });
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

// Only two mutations are allowed on a submitted request, both Chairman-only
// (UC52): approve or reject. UC53 BR-02 — the requester can never edit
// amount/purpose/date/description/attachment once submitted, in any status;
// that entire class of edit is simply not accepted here.
const update = async (req, res) => {
  try {
    const { status, rejectContent } = req.body;
    const expense = await service.getById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Not found" });

    if (status !== "Approved" && status !== "Rejected") {
      return res.status(400).json({ error: "Yêu cầu chi tiêu đã gửi không thể chỉnh sửa nội dung (chỉ có thể duyệt hoặc từ chối)." });
    }

    const clubId = expense.club._id || expense.club;
    const access = await getAccess(req.user.id, clubId);
    if (!access.isChairman) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền duyệt hoặc từ chối yêu cầu chi tiêu." });
    }

    // Double-decision guard (mirrors the old WHERE Status='Pending' lock).
    if (expense.status !== "Pending") {
      return res.status(400).json({ error: "Yêu cầu này đã được xử lý trước đó." });
    }
    if (status === "Rejected" && (!rejectContent || !rejectContent.trim())) {
      return res.status(400).json({ error: "Vui lòng nhập lý do từ chối." });
    }

    if (status === "Approved") {
      // UC52 BR-01 — balance must cover the requested amount.
      const termId = expense.term ? expense.term._id || expense.term : null;
      const { balance } = await computeClubBalance({ club: clubId, term: termId });
      const expenseAmount = parseFloat(expense.amount.toString());
      if (balance < expenseAmount) {
        return res.status(400).json({ error: "Quỹ không đủ để duyệt yêu cầu chi tiêu này." });
      }

      // Post the ledger row (Approved immediately — approval IS the event).
      await Transactions.create({
        club: clubId,
        term: termId,
        type: "Expense",
        amount: expense.amount,
        transactionDate: new Date(),
        description: expense.description,
        attachment: expense.attachment,
        createdBy: req.user.id,
        status: "Approved",
      });
    }

    const item = await service.updateById(req.params.id, {
      status,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      rejectContent: status === "Rejected" ? rejectContent.trim() : null,
    });

    // Notify the requester of the decision (with reason on rejection).
    try {
      const approver = await Users.findById(req.user.id);
      const approverName = approver ? approver.fullName : "Chủ nhiệm";
      const statusText = status === "Approved" ? "được duyệt" : "bị từ chối";
      const reasonText = status === "Rejected" ? ` với lý do: '${rejectContent.trim()}'` : "";
      await Notification.create({
        sender: req.user.id,
        receiver: expense.createdBy._id || expense.createdBy,
        title: "Trạng thái đơn yêu cầu chi tiêu",
        content: `Đơn yêu cầu chi tiêu của bạn${expense.description ? ` (${expense.description})` : ""} đã ${statusText}${reasonText} bởi ${approverName}.`,
        priority: "HIGH",
        status: "UNREAD",
      });
    } catch (notiError) {
      console.error("Error sending notification:", notiError);
    }

    res.status(200).json({
      message: status === "Approved" ? "Đã duyệt yêu cầu chi tiêu." : "Đã từ chối yêu cầu chi tiêu.",
      data: item,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Deleting a submitted request would break the audit trail — only the
// requester may withdraw their own request, and only while it's Pending.
const remove = async (req, res) => {
  try {
    const expense = await service.getById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Not found" });

    const creatorId = (expense.createdBy._id || expense.createdBy).toString();
    if (creatorId !== req.user.id) {
      return res.status(403).json({ error: "Bạn chỉ có thể thu hồi yêu cầu do chính mình tạo." });
    }
    if (expense.status !== "Pending") {
      return res.status(400).json({ error: "Không thể thu hồi yêu cầu đã được xử lý." });
    }

    await service.deleteById(req.params.id);
    res.status(200).json({ message: "Đã thu hồi yêu cầu chi tiêu." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { create, getAll, getMine, getById, update, remove };
