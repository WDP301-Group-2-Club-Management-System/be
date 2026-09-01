const Semesters = require("../models/Semester");

const createOne = async (data) => {
  if (data.status === "ACTIVE") {
    await Semesters.updateMany(
      { status: "ACTIVE" },
      { $set: { status: "ENDED" } }
    );
  } else {
    data.status = "INACTIVE";
  }
  const item = new Semesters(data);
  return await item.save();
};

const getAll = async () => {
  return await Semesters.find().sort({ startDate: -1 }); // Sort by newest first
};

const getById = async (id) => {
  return await Semesters.findById(id);
};

const updateById = async (id, data) => {
  if (data.status === "ACTIVE") {
    await Semesters.updateMany(
      { _id: { $ne: id }, status: "ACTIVE" },
      { $set: { status: "ENDED" } }
    );
  }
  return await Semesters.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Semesters.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
