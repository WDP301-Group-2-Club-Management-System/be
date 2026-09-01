const mongoose = require("mongoose");
const { EVENT_TERM_NAME } = require("../constrant/schema");

const eventTermSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Events",
    required: true,
  },
  termName: { type: String, enum: EVENT_TERM_NAME, required: true },
  termStart: { type: Date },
  termEnd: { type: Date },
});

const EventTerms = mongoose.model("EventTerms", eventTermSchema);
module.exports = EventTerms;
