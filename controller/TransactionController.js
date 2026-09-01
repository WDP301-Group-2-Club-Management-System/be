const Transactions = require("../models/Transaction");
const MemberIncomeContributions = require("../models/MemberIncomeContribution");
const { getMembership } = require("../utils/clubAuth");
const { computeClubBalance } = require("../utils/balance");

// UC49 — the transaction ledger is read-only for every user (BR-01, log
// immutability). Rows are only ever created/flipped internally by expense
// approval, cash confirmation and the payment gateway callback; this
// controller deliberately exposes no create/update/remove at all.

// Club-scoped, filterable (Type/Status), keyword-searchable, paginated.
// UC49: only the club Chairman may view the full ledger; members see their
// own fee/payment history through my-contributions (UC50) instead.
const getAll = async (req, res) => {
  try {
    const { club, type, status, search } = req.query;
    if (!club) return res.status(400).json({ error: "Thiếu thông tin câu lạc bộ." });
    const membership = await getMembership(req.user.id, club);
    if (!membership || membership.role !== "Chủ nhiệm") {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền xem lịch sử giao dịch của câu lạc bộ." });
    }

    const filter = { club };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search && search.trim()) {
      const term_ = search.trim();
      const escaped = term_.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const or = [{ description: { $regex: escaped, $options: "i" } }];
      // Numeric keywords also match the PayOS reference code.
      if (!isNaN(Number(term_))) or.push({ referenceCode: Number(term_) });
      filter.$or = or;
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 10, 1), 50);

    const [items, total] = await Promise.all([
      Transactions.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("createdBy", "fullName email userId")
        .populate("term", "termName")
        .populate({
          path: "memberIncomeContribution",
          select: "user amount status",
          populate: { path: "user", select: "fullName userId" },
        }),
      Transactions.countDocuments(filter),
    ]);

    res.status(200).json({ data: items, pagination: { page, pageSize, total } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC48 — financial dashboard aggregation: Approved-only balance (BR-01),
// optional term filter, plus the unpaid-member-fees widget.
const getDashboard = async (req, res) => {
  try {
    const { club, term } = req.query;
    if (!club) return res.status(400).json({ error: "Thiếu thông tin câu lạc bộ." });
    const membership = await getMembership(req.user.id, club);
    if (!membership || membership.role !== "Chủ nhiệm") {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền xem dashboard tài chính." });
    }

    const contributionFilter = { club, status: "Pending" };
    if (term) contributionFilter.term = term;

    const [balance, pendingContributions, recent] = await Promise.all([
      computeClubBalance({ club, term }),
      MemberIncomeContributions.find(contributionFilter)
        .populate("user", "fullName userId")
        .populate("income", "description dueDate"),
      Transactions.find({ club, ...(term ? { term } : {}) })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("createdBy", "fullName"),
    ]);

    const unpaidTotal = pendingContributions.reduce(
      (sum, c) => sum + parseFloat(c.amount.toString()),
      0,
    );

    res.status(200).json({
      data: {
        ...balance,
        unpaidFees: { count: pendingContributions.length, total: unpaidTotal, items: pendingContributions },
        recentTransactions: recent,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC49 step 2 — full detail of one transaction, Chairman of the
// transaction's own club only (same gate as the ledger list above).
const getById = async (req, res) => {
  try {
    const item = await Transactions.findById(req.params.id)
      .populate("club", "clubName")
      .populate("term", "termName")
      .populate("createdBy", "fullName email userId")
      .populate({
        path: "memberIncomeContribution",
        populate: { path: "user", select: "fullName userId" },
      });
    if (!item) return res.status(404).json({ error: "Not found" });

    const clubId = item.club._id || item.club;
    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== "Chủ nhiệm") {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền xem chi tiết giao dịch của câu lạc bộ." });
    }

    res.status(200).json({ data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAll, getDashboard, getById };
