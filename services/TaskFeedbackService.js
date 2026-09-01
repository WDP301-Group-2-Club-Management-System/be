const TaskFeedbacks = require("../models/TaskFeedback");

const createOne = async (data) => { const item = new TaskFeedbacks(data); return await item.save(); };
const getAll = async (filter = {}) => await TaskFeedbacks.find(filter).sort({ createdAt: -1 }).populate("task", "title");
const getById = async (id) => await TaskFeedbacks.findById(id).populate("task", "title");
const updateById = async (id, data) => await TaskFeedbacks.findByIdAndUpdate(id, data, { new: true });
const deleteById = async (id) => await TaskFeedbacks.findByIdAndDelete(id);

module.exports = { createOne, getAll, getById, updateById, deleteById };
