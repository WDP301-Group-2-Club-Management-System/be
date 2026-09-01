const Clubs = require("../models/Club");
const UserClubs = require("../models/UserClub");

const createOne = async (data) => {
  const item = new Clubs(data);
  return await item.save();
};

const getAll = async () => {
  const clubs = await Clubs.find().populate("departments", "departmentName").populate("parentClubId", "clubName").lean();
  for (let club of clubs) {
    club.membersCount = await UserClubs.countDocuments({ club: club._id, isActive: true });
  }
  return clubs;
};

const getById = async (id) => {
  const club = await Clubs.findById(id).populate("departments", "departmentName").populate("parentClubId", "clubName").lean();
  if (club) {
    club.membersCount = await UserClubs.countDocuments({ club: club._id, isActive: true });
  }
  return club;
};

const updateById = async (id, data) => {
  return await Clubs.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await Clubs.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
