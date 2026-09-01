const UserClubs = require("../models/UserClub");

const createOne = async (data) => { const item = new UserClubs(data); return await item.save(); };
const getAll = async (filter = {}) => await UserClubs.find(filter).populate("user", "fullName email userId").populate("club", "clubName").populate("department", "departmentName");
const getById = async (id) => await UserClubs.findById(id).populate("user", "fullName email userId").populate("club", "clubName").populate("department", "departmentName");
const updateById = async (id, data) => await UserClubs.findByIdAndUpdate(id, data, { new: true });
const deleteById = async (id) => await UserClubs.findByIdAndDelete(id);

module.exports = { createOne, getAll, getById, updateById, deleteById };
