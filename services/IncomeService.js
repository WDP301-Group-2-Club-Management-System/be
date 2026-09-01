const Income = require("../models/Income");

const createOne = async (data) => {
  const item = new Income(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await Income.find(filter)
    .sort({ createdAt: -1 })
    .populate("club", "clubName")
    .populate("term", "termName")
    .populate("createdBy", "fullName email")
    .populate("completedBy", "fullName");
};

const getById = async (id) => {
  return await Income.findById(id)
    .populate("club", "clubName")
    .populate("term", "termName");
};

const updateById = async (id, data) => {
  return await Income.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Income.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
