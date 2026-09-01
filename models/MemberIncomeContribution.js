const mongoose = require("mongoose");
const { CONTRIBUTION_STATUS } = require("../constrant/schema");

// Per-member fee invoice, mirrors the old system's
// MemberIncomeContributions table: one row per active member, generated
// automatically when a "Phí thành viên" income source is created.
const memberIncomeContributionSchema = new mongoose.Schema(
  {
    income: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Income",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    term: { type: mongoose.Schema.Types.ObjectId, ref: "Semesters" },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: CONTRIBUTION_STATUS,
      default: "Pending",
    },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date, default: null },
    // UC51 BR-01 — manual cash confirmation must record which leader
    // performed it (the old system never tracked this).
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transactions",
      default: null,
    },
  },
  { timestamps: true },
);

// Mirrors the old UNIQUE(IncomeID, UserID) constraint — one invoice per
// member per income source, no duplicates.
memberIncomeContributionSchema.index({ income: 1, user: 1 }, { unique: true });

const MemberIncomeContributions = mongoose.model(
  "MemberIncomeContributions",
  memberIncomeContributionSchema,
);
module.exports = MemberIncomeContributions;
