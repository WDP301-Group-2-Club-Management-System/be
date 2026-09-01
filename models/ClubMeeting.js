const mongoose = require("mongoose");

const clubMeetingSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Departments",
      default: null,
    }, // Kết nối thẳng phòng ban thay thế cấu trúc ClubDepartment trung gian [cite: 327]
    meetingTitle: { type: String, required: true },
    description: { type: String },
    urlMeeting: { type: String },
    startedTime: { type: Date, required: true },
    endTime: { type: Date },
    document: { type: String },
    status: {
      type: String,
      enum: ['UPCOMING', 'ONGOING', 'CANCELLED', 'COMPLETED'],
      default: 'UPCOMING'
    },

    // Áp dụng Đề xuất số 4: XÓA bảng trung gian ClubMeetingParticipants, nhúng trực tiếp danh sách [cite: 426, 428]
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
          required: true,
        },
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Departments",
        }, // Nếu là cuộc họp riêng của phòng ban đó [cite: 428]
      },
    ],
  },
  { timestamps: true },
);

const ClubMeetings = mongoose.model("ClubMeetings", clubMeetingSchema);
module.exports = ClubMeetings;
