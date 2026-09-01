const ActiveMembers = require("../models/ActiveMember");

const createOne = async (data) => {
  const item = new ActiveMembers(data);
  return await item.save();
};

const getAll = async () => {
  return await ActiveMembers.find()
    .populate("user", "fullName email")
    .populate("club", "clubName")
    .populate("term", "termName");
};

const getById = async (id) => {
  return await ActiveMembers.findById(id)
    .populate("user", "fullName email")
    .populate("club", "clubName")
    .populate("term", "termName");
};

const updateById = async (id, data) => {
  return await ActiveMembers.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await ActiveMembers.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
