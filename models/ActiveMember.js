const mongoose = require("mongoose");

const activeMemberSchema = new mongoose.Schema(
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
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semesters",
      required: true,
    },
    activeDate: { type: Date, required: true, default: Date.now },
    isActive: { type: Boolean, default: true },
    progressPoint: { type: Number, default: null }, 
    comment: { type: String, default: null }, // Nhận xét đánh giá
  },
  { timestamps: true },
);

const ActiveMembers = mongoose.model("ActiveMembers", activeMemberSchema);
module.exports = ActiveMembers;
