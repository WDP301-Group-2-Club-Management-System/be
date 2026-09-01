const Tasks = require("../models/Task");

const createOne = async (data) => {
  if (data.parentTaskId) {
    const parentTask = await Tasks.findById(data.parentTaskId);
    if (parentTask) {
      data.event = parentTask.event;
      data.term = parentTask.term;
    }
  }
  const item = new Tasks(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await Tasks.find(filter)
    .populate("event", "eventName")
    .populate("term", "termName")
    .populate("user", "fullName email")
    .populate("department", "departmentName")
    .populate("club", "clubName")
    .populate("createdBy", "fullName email");
};

const getById = async (id) => {
  return await Tasks.findById(id)
    .populate("event", "eventName")
    .populate("term", "termName")
    .populate("user", "fullName email")
    .populate("department", "departmentName")
    .populate("club", "clubName")
    .populate("createdBy", "fullName email");
};

const updateById = async (id, data) => {
  return await Tasks.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Tasks.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
