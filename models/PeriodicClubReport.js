const mongoose = require("mongoose");
const { APPROVAL_STATUS } = require("../constrant/schema");

const periodicClubReportSchema = new mongoose.Schema(
  {
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
    // 1. Quản lý trạng thái để phục vụ việc Lưu nháp và Duyệt
    status: {
      type: String,
      enum: APPROVAL_STATUS,
      default: "PENDING",
    },
    // Chứa lý do của PDP nếu báo cáo bị từ chối, giúp Chairman biết đường sửa (Thông tin cực quan trọng cần thêm)
    rejectReason: {
      type: String,
      default: null,
    },

    // 2. Lưu trữ Điểm rèn luyện của kỳ này
    membersEvaluation: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: "Users" }, // Hoặc collection quản lý Member của bạn
        score: { type: Number, required: true },
        note: { type: String, default: "" },
      },
    ],

    // 3. Lưu trữ Link minh chứng cho các Event
    eventsSummary: [
      {
        event: { type: mongoose.Schema.Types.ObjectId, ref: "Events" },
        proofUrl: { type: String, required: true },
      },
    ],

    // 4. Lưu trữ Thành tích/Giải thưởng phát sinh trong kỳ
    awards: [
      {
        awardName: { type: String, required: true },
        type: { type: String, enum: ["TEAM", "INDIVIDUAL"], required: true },
        member: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
          default: null, // Sẽ có ID nếu type là INDIVIDUAL
        },
        proofUrl: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

const PeriodicClubReports = mongoose.model(
  "PeriodicClubReports",
  periodicClubReportSchema,
);
module.exports = PeriodicClubReports;
