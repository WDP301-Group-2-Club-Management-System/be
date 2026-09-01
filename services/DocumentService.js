const Documents = require("../models/Document");

const createOne = async (data) => {
  const item = new Documents(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await Documents.find(filter)
    .populate("club", "clubName")
    .populate("department", "departmentName")
    .populate("event", "eventName");
};

const getById = async (id) => {
  return await Documents.findById(id)
    .populate("club", "clubName")
    .populate("department", "departmentName")
    .populate("event", "eventName");
};

const updateById = async (id, data) => {
  return await Documents.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Documents.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
