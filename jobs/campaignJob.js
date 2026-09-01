const RecruitmentCampaigns = require("../models/RecruitmentCampaign");
const Clubs = require("../models/Club");

const syncClubRecruitingStatus = async (clubId) => {
  if (!clubId) return;
  const openCampaign = await RecruitmentCampaigns.findOne({ club: clubId, status: "OPEN" });
  await Clubs.findByIdAndUpdate(clubId, { isRecruiting: !!openCampaign });
};

const checkCampaignStatus = async () => {
  try {
    const now = new Date();

    // 1. DRAFT -> OPEN
    const toOpen = await RecruitmentCampaigns.find({ status: 'DRAFT', startDate: { $lte: now } });
    for (const c of toOpen) {
      c.status = 'OPEN';
      // If it also expired instantly
      if (c.endDate && c.endDate <= now) {
        c.status = 'CLOSED';
      }
      await c.save();
      await syncClubRecruitingStatus(c.club);
      console.log(`[Job] Campaign ${c._id} changed status to ${c.status}`);
    }

    // 2. OPEN -> CLOSED
    const toClose = await RecruitmentCampaigns.find({ status: 'OPEN', endDate: { $lte: now } });
    for (const c of toClose) {
      c.status = 'CLOSED';
      await c.save();
      await syncClubRecruitingStatus(c.club);
      console.log(`[Job] Campaign ${c._id} changed status to CLOSED`);
    }
  } catch (error) {
    console.error("[Job] Error checking campaign status:", error);
  }
};

const startCampaignJob = () => {
  // Run immediately on start
  checkCampaignStatus();

  // Run every 1 minute
  setInterval(checkCampaignStatus, 60 * 1000);
  console.log("Campaign status background job started.");
};

module.exports = startCampaignJob;
