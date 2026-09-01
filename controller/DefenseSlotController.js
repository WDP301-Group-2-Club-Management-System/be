const slotService = require("../services/DefenseSlotService");

const getSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: "Date parameter is required" });
    }
    const result = await slotService.getSlotsForWeek(date);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const toggleLock = async (req, res) => {
  try {
    const { date, slotNumber } = req.body;
    if (!date || !slotNumber) {
      return res.status(400).json({ success: false, error: "date and slotNumber are required" });
    }
    const record = await slotService.toggleSlotLock(date, parseInt(slotNumber));
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const cancelSlotBooking = async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ success: false, error: "eventId is required" });
    }
    await slotService.cancelBooking(eventId);
    return res.status(200).json({ success: true, message: "Booking cancelled successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const rescheduleSlotBooking = async (req, res) => {
  try {
    const { eventId, newDate, newSlotNumber } = req.body;
    if (!eventId || !newDate || !newSlotNumber) {
      return res.status(400).json({ success: false, error: "eventId, newDate, and newSlotNumber are required" });
    }
    await slotService.rescheduleBooking(eventId, newDate, parseInt(newSlotNumber));
    return res.status(200).json({ success: true, message: "Rescheduled booking successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getSlots, toggleLock, cancelSlotBooking, rescheduleSlotBooking };
