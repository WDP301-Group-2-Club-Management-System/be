const RecruitmentCampaigns = require("../models/RecruitmentCampaign");
const Clubs = require("../models/Club");

const syncClubRecruitingStatus = async (clubId) => {
  if (!clubId) return;
  const openCampaign = await RecruitmentCampaigns.findOne({ club: clubId, status: "OPEN" });
  await Clubs.findByIdAndUpdate(clubId, { isRecruiting: !!openCampaign });
};

const createOne = async (data) => {
  const item = new RecruitmentCampaigns(data);
  const savedItem = await item.save();
  await syncClubRecruitingStatus(savedItem.club);
  return savedItem;
};

const getAll = async (query = {}) => {
  const filter = {};
  if (query.club) filter.club = query.club;
  if (query.status) filter.status = query.status;

  return await RecruitmentCampaigns.find(filter)
    .populate("club", "clubName")
    .populate("createdBy", "fullName email")
    .populate("stages.notificationTemplate", "templateName title")
    .sort({ createdAt: -1 });
};

const getById = async (id) => {
  const campaign = await RecruitmentCampaigns.findById(id)
    .populate("club", "clubName")
    .populate("createdBy", "fullName email")
    .populate("stages.notificationTemplate", "templateName title");
  
  if (!campaign) return null;

  const RecruitmentApplications = require("../models/RecruitmentApplication");
  const count = await RecruitmentApplications.countDocuments({ campaign: id });
  
  return { ...campaign.toObject(), candidateCount: count };
};

const updateById = async (id, data) => {
  const updatedItem = await RecruitmentCampaigns.findByIdAndUpdate(id, data, { new: true });
  if (updatedItem) {
    await syncClubRecruitingStatus(updatedItem.club);
  }
  return updatedItem;
};

const deleteById = async (id) => {
  const deletedItem = await RecruitmentCampaigns.findByIdAndDelete(id);
  if (deletedItem) {
    await syncClubRecruitingStatus(deletedItem.club);
  }
  return deletedItem;
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
