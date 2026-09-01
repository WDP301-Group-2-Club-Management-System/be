const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    departmentName: { type: String, required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Clubs", required: true },
    departmentStatus: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: true },
);

const Departments = mongoose.model("Departments", departmentSchema);
module.exports = Departments;
