const RecruitmentApplications = require("../models/RecruitmentApplication");

const createOne = async (data) => {
  const item = new RecruitmentApplications(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await RecruitmentApplications.find(filter)
    .populate("user", "fullName email userId avatarUrl phone gender")
    .populate("campaign", "title club")
    .sort({ createdAt: -1 });
};

const getById = async (id) => {
  return await RecruitmentApplications.findById(id)
    .populate("user", "fullName email userId avatarUrl phone gender")
    .populate("campaign", "title club");
};

const updateById = async (id, data) => {
  return await RecruitmentApplications.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await RecruitmentApplications.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
