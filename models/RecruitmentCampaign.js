const mongoose = require("mongoose");
const { RECRUITMENT_STATUS } = require("../constrant/schema");

// Áp dụng Đề xuất số 6: Nhúng thẳng ID Template thông báo cấu hình tương ứng vào chiến dịch/vòng tuyển dụng nhằm xóa bảng trung gian StageNotifications [cite: 432, 434]
const recruitmentCampaignSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: "Clubs", required: true }, 
  gen: { type: Number, default: 1 }, 
  title: { type: String }, 
  description: { type: String }, 
  startDate: { type: Date }, 
  endDate: { type: Date }, 
  formLink: { type: String, required: true },
  status: { type: String, enum: RECRUITMENT_STATUS, default: 'DRAFT' }, 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" }, 
  
  // Các vòng tuyển dụng của chiến dịch này (Nhúng trực tiếp liên kết Notification Template) [cite: 434]
  stages: [
    {
      stageName: { type: String, required: true },
      sequenceOrder: { type: Number, required: true }, // Vòng 1, Vòng 2...
      notificationTemplate: { type: mongoose.Schema.Types.ObjectId, ref: "NotificationTemplates", default: null } // Nhúng thiết lập biểu mẫu tại đây [cite: 434]
    }
  ]
}, { timestamps: true });

const RecruitmentCampaigns = mongoose.model("RecruitmentCampaigns", recruitmentCampaignSchema);
module.exports = RecruitmentCampaigns;