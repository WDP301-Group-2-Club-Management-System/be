const mongoose = require("mongoose");
const { APPROVAL_STATUS } = require("../constrant/schema");

const periodicClubReportRecordSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PeriodicClubReports",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: APPROVAL_STATUS,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  },
  { timestamps: true }
);

const PeriodicClubReportRecords = mongoose.model(
  "PeriodicClubReportRecords",
  periodicClubReportRecordSchema
);

module.exports = PeriodicClubReportRecords;
