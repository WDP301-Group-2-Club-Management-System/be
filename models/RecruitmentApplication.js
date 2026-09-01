const mongoose = require("mongoose");

const recruitmentApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentCampaigns", required: true },
  introduction: { type: String, required: false },
  cvLink: { type: String, required: false },
  status: { type: String, enum: ['NEW', 'INTERVIEW', 'CHALLENGE', 'ACCEPTED', 'REJECTED'], default: 'NEW' },
  rejectReason: { type: String, default: null }
}, { timestamps: true });

// Ensures a user can only apply once to a specific campaign
recruitmentApplicationSchema.index({ user: 1, campaign: 1 }, { unique: true });

const RecruitmentApplications = mongoose.model("RecruitmentApplications", recruitmentApplicationSchema);
module.exports = RecruitmentApplications;
