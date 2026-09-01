const Transactions = require("../models/Transaction");

// UC48 BR-01 — the club balance is calculated real-time strictly from
// 'Approved' transactions on the ledger (Income − Expense); Pending and
// Rejected rows never count. Single source of truth, shared by the
// financial dashboard and the expense-approval balance check — mirrors the
// old system's getClubBalance SQL, which both its dashboards and its
// approval flow relied on.
const computeClubBalance = async ({ club, term }) => {
  // Aggregation pipelines don't auto-cast strings to ObjectId the way
  // find() does — cast explicitly so controllers can pass either.
  const { Types } = require("mongoose");
  const match = { club: new Types.ObjectId(String(club)), status: "Approved" };
  if (term) match.term = new Types.ObjectId(String(term));

  const rows = await Transactions.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        total: { $sum: { $toDouble: "$amount" } },
      },
    },
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  for (const row of rows) {
    if (row._id === "Income") totalIncome = row.total;
    else if (row._id === "Expense") totalExpense = row.total;
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
};

module.exports = { computeClubBalance };
