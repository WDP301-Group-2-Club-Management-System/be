const Locations = require("../models/Location");

const createOne = async (data) => {
  const item = new Locations(data);
  return await item.save();
};

const getAll = async () => {
  return await Locations.find();
};

const getById = async (id) => {
  return await Locations.findById(id);
};

const updateById = async (id, data) => {
  return await Locations.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Locations.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
