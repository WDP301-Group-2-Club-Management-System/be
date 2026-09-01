const mongoose = require("mongoose");
const {
  CLUB_APPROVAL_ACTION,
  CLUB_REQUEST_TYPE,
} = require("../constrant/schema");

const clubApprovalHistorySchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: "Clubs", required: true },
  actionType: { type: String, enum: CLUB_APPROVAL_ACTION, required: true },
  title: { type: String, default: null },
  reason: { type: String },
  requestType: { type: String, enum: CLUB_REQUEST_TYPE, default: null },
  actionAt: { type: Date, default: Date.now },
});

const ClubApprovalHistory = mongoose.model(
  "ClubApprovalHistory",
  clubApprovalHistorySchema,
);
module.exports = ClubApprovalHistory;
