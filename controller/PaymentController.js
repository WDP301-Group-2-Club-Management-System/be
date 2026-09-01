const MemberIncomeContributions = require("../models/MemberIncomeContribution");
const Income = require("../models/Income");
const Transactions = require("../models/Transaction");
const payos = require("../utils/payos");

const frontendResultUrl = (params) => {
  const base = `${process.env.FRONTEND_URL || "http://localhost:3001"}/membership-fees/result`;
  const qs = new URLSearchParams(params).toString();
  return `${base}?${qs}`;
};

// UC50 — start an online payment for one's OWN fee invoice.
const createPayment = async (req, res) => {
  try {
    const { contributionId } = req.body;
    if (!contributionId) {
      return res.status(400).json({ error: "Thiếu thông tin hóa đơn." });
    }

    const contribution = await MemberIncomeContributions.findById(contributionId);
    if (!contribution) return res.status(404).json({ error: "Không tìm thấy hóa đơn." });

    // The concrete UC50 ownership rule — the exact IDOR the old system had:
    // only the invoice's owner may view/pay it, anyone else gets 403.
    if (contribution.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Bạn không có quyền thanh toán hóa đơn của thành viên khác." });
    }
    // UC50 BR-02 — duplicate payment prevention.
    if (contribution.status === "Paid") {
      return res.status(400).json({ error: "Hóa đơn này đã được thanh toán." });
    }

    const income = await Income.findById(contribution.income);
    if (income?.isLocked) {
      return res.status(400).json({ error: "Khoản thu đã được khóa, không thể thanh toán thêm." });
    }
    // Overdue fee invoices can no longer be paid online — the club leader
    // must extend the deadline (extendDeadline below) to reopen payment.
    if (income?.dueDate && new Date(income.dueDate) < new Date()) {
      return res.status(400).json({ error: "Hóa đơn đã quá hạn nộp. Vui lòng liên hệ Chủ nhiệm/Trưởng ban để gia hạn." });
    }

    // Business checks above run regardless; the gateway config gate sits
    // here so an unconfigured server still answers 403/400 accurately.
    if (!payos.isConfigured()) {
      return res.status(503).json({ error: "Cổng thanh toán chưa được cấu hình. Vui lòng liên hệ quản trị viên." });
    }

    const amount = Math.round(parseFloat(contribution.amount.toString()));

    // Reuse the existing Pending gateway transaction instead of stacking a
    // new row per click (the old system accumulated orphan Pending rows).
    // A PayOS orderCode can only ever carry ONE payment link, and the old
    // link's checkoutUrl can't be retrieved later — so on re-initiation the
    // previous link is cancelled (unpayable) and the transaction rotates to
    // a fresh orderCode before creating the new link. Guarantees exactly
    // one live payable link, always matching the tracked referenceCode.
    let tx = await Transactions.findOne({
      memberIncomeContribution: contribution._id,
      status: "Pending",
      paymentMethod: "PAYOS",
    });
    if (tx) {
      await payos.cancelPaymentLink(tx.referenceCode, "Tạo lại link thanh toán");
      tx.referenceCode = payos.generateOrderCode();
      await tx.save();
    } else {
      tx = await Transactions.create({
        club: contribution.club,
        term: contribution.term,
        type: "Income",
        amount,
        description: "Thu phí thành viên (PayOS)",
        createdBy: req.user.id,
        status: "Pending",
        paymentMethod: "PAYOS",
        referenceCode: payos.generateOrderCode(),
        memberIncomeContribution: contribution._id,
      });
    }

    const link = await payos.createPaymentLink({
      orderCode: tx.referenceCode,
      amount,
      description: `Phi CLB ${tx.referenceCode % 100000}`,
      returnUrl: `${process.env.BASE_URL_API || "http://localhost:9999"}/api/payments/payos/return`,
      cancelUrl: `${process.env.BASE_URL_API || "http://localhost:9999"}/api/payments/payos/return`,
    });

    res.status(200).json({
      message: "Đã tạo link thanh toán.",
      data: { checkoutUrl: link.checkoutUrl, orderCode: tx.referenceCode },
    });
  } catch (error) {
    console.error("createPayment error:", error);
    res.status(500).json({ error: "Không tạo được link thanh toán. Vui lòng thử lại." });
  }
};

// Shared idempotent finalizer — applies the payment result exactly once.
// Used by both the return-URL flow and the webhook flow.
const applyPaymentResult = async (orderCode, isPaid) => {
  const tx = await Transactions.findOne({ referenceCode: Number(orderCode), paymentMethod: "PAYOS" });
  if (!tx) return { ok: false, reason: "not-found" };

  // Idempotency: only a Pending transaction can be finalized; replays and
  // refreshes of the return URL become no-ops.
  if (tx.status !== "Pending") return { ok: true, already: true, paid: tx.status === "Approved" };

  if (isPaid) {
    const updated = await MemberIncomeContributions.findOneAndUpdate(
      { _id: tx.memberIncomeContribution, status: "Pending" },
      { status: "Paid", paidDate: new Date(), transaction: tx._id },
      { new: true },
    );
    // Contribution already paid through another channel (e.g. cash-confirm
    // raced ahead): reject this gateway transaction rather than double-count.
    if (!updated) {
      await Transactions.updateOne({ _id: tx._id, status: "Pending" }, { status: "Rejected" });
      return { ok: true, already: true, paid: true };
    }
    await Transactions.updateOne(
      { _id: tx._id, status: "Pending" },
      { status: "Approved", transactionDate: new Date() },
    );
    return { ok: true, paid: true };
  }

  await Transactions.updateOne({ _id: tx._id, status: "Pending" }, { status: "Rejected" });
  return { ok: true, paid: false };
};

// Public return-URL — the user lands here from the PayOS checkout page.
// Query params are unsigned, so the real status is re-fetched server-side
// from PayOS before anything is applied. Always ends in a redirect to the
// frontend result page (UC50 main scenario step 3 / alternative 3a).
const payosReturn = async (req, res) => {
  const { orderCode } = req.query;
  try {
    if (!orderCode) return res.redirect(frontendResultUrl({ status: "invalid" }));

    // clubId is only for the FE's "back to my invoices" link (which club-
    // scoped page to send the user to) — never used for authorization here.
    let clubId = "";
    const tx = await Transactions.findOne({ referenceCode: Number(orderCode), paymentMethod: "PAYOS" })
      .populate("memberIncomeContribution", "club");
    if (tx?.memberIncomeContribution?.club) {
      clubId = tx.memberIncomeContribution.club.toString();
    }

    const info = await payos.getPaymentInfo(orderCode);
    const isPaid = info.status === "PAID";
    const isFinal = ["PAID", "CANCELLED", "EXPIRED"].includes(info.status);
    if (!isFinal) {
      // Still pending on the gateway side — don't finalize anything yet.
      return res.redirect(frontendResultUrl({ status: "pending", orderCode, clubId }));
    }

    const result = await applyPaymentResult(orderCode, isPaid);
    if (!result.ok) return res.redirect(frontendResultUrl({ status: "invalid", clubId }));
    return res.redirect(
      frontendResultUrl({ status: result.paid ? "success" : "cancelled", orderCode, clubId }),
    );
  } catch (error) {
    console.error("payosReturn error:", error);
    return res.redirect(frontendResultUrl({ status: "error", orderCode: orderCode || "" }));
  }
};

// Public webhook — signature-verified via the SDK (throws on tampering).
// The reliable channel once deployed with a public URL; same idempotent
// finalizer as the return flow, so double delivery is harmless.
const payosWebhook = async (req, res) => {
  try {
    const data = await payos.verifyWebhook(req.body);
    const isPaid = data.code === "00";
    await applyPaymentResult(data.orderCode, isPaid);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("payosWebhook error:", error.message);
    res.status(400).json({ success: false });
  }
};

module.exports = { createPayment, payosReturn, payosWebhook };
