const Departments = require("../models/Department");

const createOne = async (data) => {
  const item = new Departments(data);
  return await item.save();
};

const getAll = async () => {
  return await Departments.find();
};

const getById = async (id) => {
  return await Departments.findById(id);
};

const updateById = async (id, data) => {
  return await Departments.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Departments.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
