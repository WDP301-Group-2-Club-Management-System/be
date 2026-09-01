const mongoose = require("mongoose");
const { EVENT_LOCATION_TYPE } = require("../constrant/schema");

const locationSchema = new mongoose.Schema(
  {
    locationName: { type: String, required: true },
    typeLocation: { type: String, enum: EVENT_LOCATION_TYPE, required: true },
  },
  { timestamps: true },
);

const Locations = mongoose.model("Locations", locationSchema);
module.exports = Locations;
