const EventSchedules = require("../models/EventSchedule");

const createOne = async (data) => {
  const item = new EventSchedules(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await EventSchedules.find(filter)
    .populate("event", "eventName")
    .populate("location", "locationName");
};

const getById = async (id) => {
  return await EventSchedules.findById(id)
    .populate("event", "eventName")
    .populate("location", "locationName");
};

const updateById = async (id, data) => {
  return await EventSchedules.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await EventSchedules.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
