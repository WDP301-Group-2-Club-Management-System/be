const mongoose = require("mongoose");

const notificationTemplateSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clubs",
      required: true,
    },
    templateName: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    isReusable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const NotificationTemplates = mongoose.model(
  "NotificationTemplates",
  notificationTemplateSchema,
);
module.exports = NotificationTemplates;
