const NotificationTemplates = require("../models/NotificationTemplate");

const createOne = async (data) => {
  const item = new NotificationTemplates(data);
  return await item.save();
};

const getAll = async () => {
  return await NotificationTemplates.find()
    .populate("club", "clubName")
    .populate("createdBy", "fullName email");
};

const getById = async (id) => {
  return await NotificationTemplates.findById(id)
    .populate("club", "clubName")
    .populate("createdBy", "fullName email");
};

const updateById = async (id, data) => {
  return await NotificationTemplates.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await NotificationTemplates.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
