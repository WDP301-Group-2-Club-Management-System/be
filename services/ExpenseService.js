const Expenses = require("../models/Expense");

const createOne = async (data) => {
  const item = new Expenses(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await Expenses.find(filter)
    .sort({ createdAt: -1 })
    .populate("club", "clubName")
    .populate("term", "termName")
    .populate("createdBy", "fullName email")
    .populate("approvedBy", "fullName email");
};

const getById = async (id) => {
  return await Expenses.findById(id)
    .populate("club", "clubName")
    .populate("term", "termName")
    .populate("createdBy", "fullName email")
    .populate("approvedBy", "fullName email");
};

const updateById = async (id, data) => {
  return await Expenses.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Expenses.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
