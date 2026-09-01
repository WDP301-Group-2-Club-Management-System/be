const mongoose = require("mongoose");

const eventScheduleSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Events",
      required: true,
    },
    eventDate: { type: Date, required: true },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Locations",
      required: true,
    },
    startTime: { type: String, required: true }, // Định dạng "HH:mm"
    endTime: { type: String, required: true }, // Định dạng "HH:mm"
  },
  { timestamps: true },
);

const EventSchedules = mongoose.model("EventSchedules", eventScheduleSchema);
module.exports = EventSchedules;
