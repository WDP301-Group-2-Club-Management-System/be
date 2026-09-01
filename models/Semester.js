const mongoose = require("mongoose");
const { SEMESTER_STATUS } = require("../constrant/schema");

const semesterSchema = new mongoose.Schema(
  {
    termId: { type: String, required: true, unique: true },
    termName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: SEMESTER_STATUS, default: "ACTIVE" },
  },
  { timestamps: true },
);

const Semesters = mongoose.model("Semesters", semesterSchema);
module.exports = Semesters;
