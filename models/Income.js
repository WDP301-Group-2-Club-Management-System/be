const mongoose = require("mongoose");
const { INCOME_SOURCE, INCOME_STATUS } = require("../constrant/schema");

const incomeSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Clubs", required: true },
    term: { type: mongoose.Schema.Types.ObjectId, ref: "Semesters" },
    source: { type: String, enum: INCOME_SOURCE, required: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    incomeDate: { type: Date, required: true },
    description: { type: String },
    attachment: { type: String },
    status: { type: String, enum: INCOME_STATUS, default: "Đang chờ" },
    // Deadline members must pay their contribution by (membership-fee
    // sources); copied onto each generated MemberIncomeContribution.
    dueDate: { type: Date, default: null },
    // UC51 BR-02 — "Complete" locks the income source: no more reminders,
    // lingering Pending PAYOS transactions get auto-rejected. Old system
    // only enforced this in JSP; here it's real server-side state.
    isLocked: { type: Boolean, default: false },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
    completedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
  },
  { timestamps: true },
);

const Income = mongoose.model("Income", incomeSchema);
module.exports = Income;