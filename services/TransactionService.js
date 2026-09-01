const Transactions = require("../models/Transaction");

const createOne = async (data) => { const item = new Transactions(data); return await item.save(); };
const getAll = async () => await Transactions.find().populate("club", "clubName").populate("term", "termName").populate("createdBy", "fullName email");
const getById = async (id) => await Transactions.findById(id).populate("club", "clubName").populate("term", "termName").populate("createdBy", "fullName email");
const updateById = async (id, data) => await Transactions.findByIdAndUpdate(id, data, { new: true });
const deleteById = async (id) => await Transactions.findByIdAndDelete(id);

module.exports = { createOne, getAll, getById, updateById, deleteById };
