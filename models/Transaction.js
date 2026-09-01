const mongoose = require("mongoose");
const {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  PAYMENT_METHOD,
} = require("../constrant/schema");

const transactionSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    term: { type: mongoose.Schema.Types.ObjectId, ref: "Semesters" },
    type: { type: String, enum: TRANSACTION_TYPE, required: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    transactionDate: { type: Date },
    description: { type: String },
    attachment: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    status: { type: String, enum: TRANSACTION_STATUS, default: "Pending" },
    paidDate: { type: Date, default: null },
    // dueDate was required in the original stub; relaxed since ledger rows
    // created by expense approval / cash confirmation have no meaningful due
    // date of their own (the contribution carries it).
    dueDate: { type: Date, default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHOD, default: null },
    // PayOS numeric orderCode — the reference used to reconcile a gateway
    // payment with this ledger row (unique per payment attempt).
    referenceCode: { type: Number, default: null },
    memberIncomeContribution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MemberIncomeContributions",
      default: null,
    },
  },
  { timestamps: true },
);

const Transactions = mongoose.model("Transactions", transactionSchema);
module.exports = Transactions;
