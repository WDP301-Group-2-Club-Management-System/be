const ClubApprovalHistory = require("../models/ClubApprovalHistory");

const createOne = async (data) => {
  const item = new ClubApprovalHistory(data);
  return await item.save();
};

const getAll = async () => {
  return await ClubApprovalHistory.find().populate("club", "clubName");
};

const getById = async (id) => {
  return await ClubApprovalHistory.findById(id).populate("club", "clubName");
};

const updateById = async (id, data) => {
  return await ClubApprovalHistory.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await ClubApprovalHistory.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
