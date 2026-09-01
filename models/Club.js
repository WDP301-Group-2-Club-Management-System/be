const mongoose = require("mongoose");
const {
  CLUB_CATEGORIES,
  CLUB_REQUEST_STATUS,
  CLUB_REQUEST_TYPE,
} = require("../constrant/schema");

const clubSchema = new mongoose.Schema(
  {
    clubName: { type: String, required: true },
    shortName: { type: String },
    clubImg: { type: String },
    coverImg: { type: String },
    slogan: { type: String },
    isRecruiting: { type: Boolean, default: false },
    description: { type: String },
    category: { type: String, enum: CLUB_CATEGORIES, required: true },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Documents" }],
    establishedDate: { type: Date },

    contactPhone: { type: String },
    contactGmail: { type: String, required: true },
    contactUrl: { type: String },

    // Dùng cho việc đăng ký tạo / sửa câu lạc bộ để pdp có thể duyệt
    clubStatus: { type: Boolean, default: false },
    lastRejectReason: { type: String, default: null },
    clubRequestStatus: {
      type: String,
      enum: CLUB_REQUEST_STATUS,
      default: "Pending",
    },
    currentRequestType: {
      type: String,
      enum: CLUB_REQUEST_TYPE,
      default: null,
    },
    parentClubId: { //Dùng để lưu thông tin của club phiên bản updated mà vẫn giữ được thông tin club khi chưa sửa ( vì sửa cần pdp duyệt )
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      default: null,
    },
    updateRequestNote: { type: String, default: null },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Departments" }],
  },
  { timestamps: true },
);

const Clubs = mongoose.model("Clubs", clubSchema);
module.exports = Clubs;
