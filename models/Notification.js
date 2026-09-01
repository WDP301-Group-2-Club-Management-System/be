const mongoose = require("mongoose");
const {
  NOTIFICATION_PRIORITY,
  NOTIFICATION_STATUS,
} = require("../constrant/schema");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
    priority: { type: String, enum: NOTIFICATION_PRIORITY, default: "MEDIUM" },
    status: { type: String, enum: NOTIFICATION_STATUS, default: "UNREAD" },
  },
  { timestamps: true },
);

const Notifications = mongoose.model("Notifications", notificationSchema);
module.exports = Notifications;
