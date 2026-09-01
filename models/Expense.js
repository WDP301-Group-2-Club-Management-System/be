const mongoose = require("mongoose");
const { TRANSACTION_STATUS, EXPENSE_PURPOSE } = require("../constrant/schema");

const expenseSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    term: { type: mongoose.Schema.Types.ObjectId, ref: "Semesters" },
    purpose: { type: String, enum: EXPENSE_PURPOSE, required: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    expenseDate: { type: Date, required: true },
    description: { type: String },
    attachment: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    status: { type: String, enum: TRANSACTION_STATUS, default: "Pending" },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
    approvedAt: { type: Date },
    rejectContent: { type: String },
  },
  { timestamps: true },
);

const Expenses = mongoose.model("Expenses", expenseSchema);
module.exports = Expenses;
