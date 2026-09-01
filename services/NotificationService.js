const Notifications = require("../models/Notification");

const createOne = async (data) => {
  const item = new Notifications(data);
  return await item.save();
};

const getAll = async (filter = {}, { page = 1, pageSize = 20 } = {}) => {
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, total] = await Promise.all([
    Notifications.find(filter)
      .populate("receiver", "fullName email")
      .populate("sender", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(pageSize)),
    Notifications.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), pageSize: Number(pageSize) };
};

const getById = async (id) => {
  return await Notifications.findById(id)
    .populate("receiver", "fullName email")
    .populate("sender", "fullName email");
};

const updateById = async (id, data) => {
  return await Notifications.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Notifications.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
