const Agenda = require("../models/Agenda");

const createOne = async (data) => {
  const item = new Agenda(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await Agenda.find(filter).populate("schedule");
};

const getById = async (id) => {
  return await Agenda.findById(id).populate("schedule");
};

const updateById = async (id, data) => {
  return await Agenda.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Agenda.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
