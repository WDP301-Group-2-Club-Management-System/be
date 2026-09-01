const mongoose = require("mongoose");
const { CLUB_ROLES } = require("../constrant/schema");

const userClubSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Departments",
    },
    role: { type: String, enum: CLUB_ROLES, required: true },
    joinDate: { type: Date, required: true, default: Date.now },
    isActive: { type: Boolean, default: true },
    gen: { type: Number },
  },
  { timestamps: true },
);

const UserClubs = mongoose.model("UserClubs", userClubSchema);
module.exports = UserClubs;
