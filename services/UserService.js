const Users = require("../models/User");

const createOne = async (data) => { const item = new Users(data); return await item.save(); };
const getAll = async () => await Users.find().select("-password -resetToken -tokenExpiry");
const getById = async (id) => await Users.findById(id).select("-password -resetToken -tokenExpiry");
const getByEmail = async (email) => await Users.findOne({ email });
const getByUserId = async (userId) => await Users.findOne({ userId });
const updateById = async (id, data) => await Users.findByIdAndUpdate(id, data, { new: true }).select("-password -resetToken -tokenExpiry");
const deleteById = async (id) => await Users.findByIdAndDelete(id);

module.exports = { createOne, getAll, getById, getByEmail, getByUserId, updateById, deleteById };
