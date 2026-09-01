const PeriodicClubReportRecords = require("../models/PeriodicClubReportRecord");

const createOne = async (data) => {
  const item = new PeriodicClubReportRecords(data);
  return await item.save();
};

const getHistoryByReportId = async (reportId) => {
  return await PeriodicClubReportRecords.find({ report: reportId })
    .populate("createdBy", "fullName email mssv")
    .sort({ createdAt: 1 });
};

module.exports = { createOne, getHistoryByReportId };
