const mongoose = require("mongoose");
const {
  APPROVAL_STATUS,
  EVENT_PARTICIPANT_STATUS,
  EVENT_STATUS,
} = require("../constrant/schema");

const eventSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true },
    eventImg: { type: String },
    description: { type: String },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    isPublic: { type: Boolean, default: false },
    formId: { type: Number },
    capacity: { type: Number },
    status: { type: String, enum: EVENT_STATUS },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUS,
      default: "PENDING",
    },
    rejectionReason: { type: String },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semesters" },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
          required: true,
        },
        status: {
          type: String,
          enum: EVENT_PARTICIPANT_STATUS,
          default: "REGISTERED",
        },
        questionsForBTC: { type: String },
        registeredName: { type: String },
        registeredStudentCode: { type: String },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
    defenseDate: { type: String, default: null }, // Định dạng: "YYYY-MM-DD"
    defenseSlot: { type: Number, default: null }, // 1, 2, 3, 4
  },
  { timestamps: true },
);

const Events = mongoose.model("Events", eventSchema);
module.exports = Events;
