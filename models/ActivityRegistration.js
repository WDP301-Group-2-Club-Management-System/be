const mongoose = require("mongoose");
const { APPROVAL_STATUS } = require("../constrant/schema");

const activityRegistrationSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    memberCount: {
      type: Number,
      required: true,
      default: 0,
    },
    planDocument: {
      type: String, // URL of the uploaded document
      required: true,
    },
    status: {
      type: String,
      enum: APPROVAL_STATUS,
      default: "PENDING",
    },
    rejectReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const ActivityRegistrations = mongoose.model(
  "ActivityRegistrations",
  activityRegistrationSchema
);
module.exports = ActivityRegistrations;
