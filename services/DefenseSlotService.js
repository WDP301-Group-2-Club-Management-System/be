const DefenseSlots = require("../models/DefenseSlot");
const Events = require("../models/Event");

// Helper to find the Monday date (YYYY-MM-DD) for a given date
const getMonday = (dateStr) => {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const d = new Date(year, month, day);
  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const mon = new Date(year, month, diff);
  
  const monYear = mon.getFullYear();
  const monMonth = String(mon.getMonth() + 1).padStart(2, '0');
  const monDay = String(mon.getDate()).padStart(2, '0');
  return `${monYear}-${monMonth}-${monDay}`;
};

// Helper to get all Mon-Fri dates in the week
const getWeekDays = (mondayStr) => {
  const parts = mondayStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(year, month, day + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${dateVal}`);
  }
  return dates;
};

const getSlotsForWeek = async (dateStr) => {
  const monday = getMonday(dateStr);
  const weekDays = getWeekDays(monday); // [Mon, Tue, Wed, Thu, Fri]

  // Find locked slots in this week
  const lockedSlots = await DefenseSlots.find({
    date: { $in: weekDays }
  });

  // Find events scheduled for defense in this week
  const bookedEvents = await Events.find({
    defenseDate: { $in: weekDays }
  }).populate("club", "clubName");

  const slots = [];
  const slotTimes = {
    1: { startTime: "09:00", endTime: "11:00" },
    2: { startTime: "13:00", endTime: "15:00" },
    3: { startTime: "15:30", endTime: "17:30" },
    4: { startTime: "18:00", endTime: "20:00" },
  };

  weekDays.forEach((dayStr) => {
    const parts = dayStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    const dayName = dayNames[d.getDay()];

    for (let slotNum = 1; slotNum <= 4; slotNum++) {
      const lockedRecord = lockedSlots.find(
        (s) => s.date === dayStr && s.slotNumber === slotNum
      );
      const bookedEvent = bookedEvents.find(
        (e) => e.defenseDate === dayStr && e.defenseSlot === slotNum
      );

      slots.push({
        date: dayStr,
        dayName,
        slotNumber: slotNum,
        startTime: slotTimes[slotNum].startTime,
        endTime: slotTimes[slotNum].endTime,
        isLocked: lockedRecord ? lockedRecord.isLocked : false,
        event: bookedEvent
          ? {
              _id: bookedEvent._id,
              eventName: bookedEvent.eventName,
              clubName: bookedEvent.club ? bookedEvent.club.clubName : "N/A",
              approvalStatus: bookedEvent.approvalStatus,
            }
          : null,
      });
    }
  });

  return { weekStart: monday, slots };
};

const toggleSlotLock = async (date, slotNumber) => {
  let record = await DefenseSlots.findOne({ date, slotNumber });
  if (record) {
    record.isLocked = !record.isLocked;
    await record.save();
  } else {
    record = new DefenseSlots({
      date,
      slotNumber,
      isLocked: true, // Mặc định ban đầu trống (không khóa), nên đổi thành khóa (true)
    });
    await record.save();
  }
  return record;
};

const cancelBooking = async (eventId) => {
  const event = await Events.findById(eventId);
  if (!event) {
    throw new Error("Không tìm thấy sự kiện");
  }
  if (event.approvalStatus === "APPROVED" || event.approvalStatus === "APPROVED_FOR_DEFENSE") {
    throw new Error("Sự kiện đã được duyệt bảo vệ hoặc phê duyệt chính thức, không thể hủy lịch");
  }
  event.defenseDate = null;
  event.defenseSlot = null;
  return await event.save();
};

const rescheduleBooking = async (eventId, newDate, newSlotNumber) => {
  const event = await Events.findById(eventId);
  if (!event) {
    throw new Error("Không tìm thấy sự kiện");
  }

  // Kiểm tra xem slot đích có bị khóa bởi PDP không
  const isLocked = await DefenseSlots.findOne({ date: newDate, slotNumber: newSlotNumber, isLocked: true });
  if (isLocked) {
    throw new Error("Khung giờ bảo vệ mới đã bị khóa bởi PDP");
  }

  // Kiểm tra xem slot đích đã có sự kiện khác đặt chưa
  const isBooked = await Events.findOne({
    _id: { $ne: eventId },
    defenseDate: newDate,
    defenseSlot: newSlotNumber
  });
  if (isBooked) {
    throw new Error("Khung giờ bảo vệ mới đã có câu lạc bộ khác đặt lịch");
  }

  event.defenseDate = newDate;
  event.defenseSlot = newSlotNumber;
  return await event.save();
};

module.exports = { getSlotsForWeek, toggleSlotLock, cancelBooking, rescheduleBooking };
