const mongoose = require("mongoose");

const defenseSlotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // Định dạng: "YYYY-MM-DD"
    slotNumber: { type: Number, required: true }, // 1, 2, 3, 4
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Tránh trùng lặp cấu hình slot cho cùng một ngày
defenseSlotSchema.index({ date: 1, slotNumber: 1 }, { unique: true });

const DefenseSlots = mongoose.model("DefenseSlots", defenseSlotSchema);
module.exports = DefenseSlots;
