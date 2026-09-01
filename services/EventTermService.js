const EventTerms = require("../models/EventTerm");

const createOne = async (data) => {
  const item = new EventTerms(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await EventTerms.find(filter).populate("event", "eventName");
};

const getById = async (id) => {
  return await EventTerms.findById(id).populate("event", "eventName");
};

const updateById = async (id, data) => {
  return await EventTerms.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await EventTerms.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
