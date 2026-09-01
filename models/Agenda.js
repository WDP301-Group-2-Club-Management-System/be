const mongoose = require("mongoose");
const { APPROVAL_STATUS } = require("../constrant/schema");

const agendaSchema = new mongoose.Schema(
  {
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventSchedules",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: APPROVAL_STATUS, default: "PENDING" },
    reason: { type: String },
  },
  { timestamps: true },
);

const Agenda = mongoose.model("Agenda", agendaSchema);
module.exports = Agenda;
