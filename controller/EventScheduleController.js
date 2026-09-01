const service = require("../services/EventScheduleService");
const EventSchedules = require("../models/EventSchedule");
const Events = require("../models/Event");

const checkConflict = async (locationId, eventDate, startTime, endTime, excludeScheduleId = null) => {
  if (!locationId || !eventDate || !startTime || !endTime) return false;

  const query = { location: locationId };
  if (excludeScheduleId) {
    query._id = { $ne: excludeScheduleId };
  }

  const targetDateStr = new Date(eventDate).toDateString();
  const existingSchedules = await EventSchedules.find(query).populate("event");
  for (const es of existingSchedules) {
    if (es.event && es.event.approvalStatus === "REJECTED") {
      continue;
    }
    const esDateStr = new Date(es.eventDate).toDateString();
    if (esDateStr === targetDateStr) {
      if (es.startTime < endTime && es.endTime > startTime) {
        return true;
      }
    }
  }
  return false;
};

const checkClubEventInterval = async (eventId, eventDate) => {
  if (!eventId || !eventDate) return false;

  const eventObj = await Events.findById(eventId);
  if (!eventObj) return false;

  // CHỈ kiểm tra khoảng cách nếu sự kiện hiện tại là PUBLIC
  if (eventObj.isPublic !== true) return false;

  const clubId = eventObj.club;

  // Lấy các sự kiện PUBLIC khác của cùng CLB (không tính sự kiện hiện tại, và không bị REJECTED)
  const otherEvents = await Events.find({
    club: clubId,
    isPublic: true,
    _id: { $ne: eventId },
    approvalStatus: { $ne: "REJECTED" }
  });

  if (otherEvents.length === 0) return false;

  const otherEventIds = otherEvents.map(e => e._id);
  const otherSchedules = await EventSchedules.find({ event: { $in: otherEventIds } });

  const targetDate = new Date(eventDate);
  targetDate.setHours(0, 0, 0, 0);

  for (const es of otherSchedules) {
    const esDate = new Date(es.eventDate);
    esDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(targetDate - esDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return true; // Có sự kiện Public khác của CLB trong vòng 7 ngày
    }
  }
  return false;
};

const checkEarliestEventDate = (eventDate) => {
  if (!eventDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 7);

  const targetDate = new Date(eventDate);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate < minDate;
};

const create = async (req, res) => {
  try {
    const { event, location, eventDate, startTime, endTime } = req.body;
    
    if (checkEarliestEventDate(eventDate)) {
      return res.status(400).json({ error: "Ngày diễn ra sự kiện phải cách ngày hiện tại ít nhất 7 ngày." });
    }

    const isConflict = await checkConflict(location, eventDate, startTime, endTime);
    if (isConflict) {
      return res.status(400).json({ error: "Địa điểm đã được sử dụng trong khoảng thời gian của lịch trình." });
    }

    const isTooClose = await checkClubEventInterval(event, eventDate);
    if (isTooClose) {
      return res.status(400).json({ error: "Khoảng cách giữa các sự kiện cộng đồng (Public) của cùng một câu lạc bộ phải tối thiểu là 7 ngày." });
    }

    const item = await service.createOne(req.body);
    res.status(201).json({ message: "Created successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const { eventId } = req.query;
    const filter = {};
    if (eventId) {
      filter.event = eventId;
    }
    const items = await service.getAll(filter);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { event, location, eventDate, startTime, endTime } = req.body;
    
    if (checkEarliestEventDate(eventDate)) {
      return res.status(400).json({ error: "Ngày diễn ra sự kiện phải cách ngày hiện tại ít nhất 7 ngày." });
    }

    const isConflict = await checkConflict(location, eventDate, startTime, endTime, req.params.id);
    if (isConflict) {
      return res.status(400).json({ error: "Địa điểm đã được sử dụng trong khoảng thời gian của lịch trình." });
    }

    let eventId = event;
    if (!eventId) {
      const existingSchedule = await EventSchedules.findById(req.params.id);
      if (existingSchedule) {
        eventId = existingSchedule.event;
      }
    }

    const isTooClose = await checkClubEventInterval(eventId, eventDate);
    if (isTooClose) {
      return res.status(400).json({ error: "Khoảng cách giữa các sự kiện cộng đồng (Public) của cùng một câu lạc bộ phải tối thiểu là 7 ngày." });
    }

    const item = await service.updateById(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Updated successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const item = await service.deleteById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const validateSchedules = async (req, res) => {
  try {
    const { schedules, eventId, clubId, isPublic } = req.body;
    console.log("=== VALIDATING SCHEDULES ===");
    console.log("Payload:", JSON.stringify({ schedules, eventId, clubId, isPublic }, null, 2));

    if (!schedules || !Array.isArray(schedules)) {
      console.log("Validation Failed: schedules is not an array");
      return res.status(400).json({ success: false, error: "Dữ liệu lịch trình không hợp lệ." });
    }

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      const { location, eventDate, startTime, endTime } = s;

      // 1. Kiểm tra ngày diễn ra sự kiện phải cách ngày hiện tại ít nhất 7 ngày
      if (checkEarliestEventDate(eventDate)) {
        console.log(`Validation Failed: Event date is too soon at index ${i}`);
        return res.status(400).json({
          success: false,
          error: `Ngày thứ ${i + 1}: Ngày diễn ra sự kiện phải cách ngày hiện tại ít nhất 7 ngày.`
        });
      }

      // 2. Kiểm tra trùng phòng/địa điểm
      const isConflict = await checkConflict(location, eventDate, startTime, endTime, eventId);
      if (isConflict) {
        console.log(`Validation Failed: Location conflict at index ${i}`);
        return res.status(400).json({
          success: false,
          error: `Ngày thứ ${i + 1}: Địa điểm đã được sử dụng trong khoảng thời gian của lịch trình.`
        });
      }

      // 2. Kiểm tra khoảng cách 7 ngày đối với sự kiện Public của cùng CLB
      if (isPublic === true) {
        const otherEvents = await Events.find({
          club: clubId,
          isPublic: true,
          _id: { $ne: eventId },
          approvalStatus: { $ne: "REJECTED" }
        });

        console.log(`Found ${otherEvents.length} other public events for club ${clubId}`);

        if (otherEvents.length > 0) {
          const otherEventIds = otherEvents.map(e => e._id);
          const otherSchedules = await EventSchedules.find({ event: { $in: otherEventIds } }).populate("event");

          const targetDate = new Date(eventDate);
          targetDate.setHours(0, 0, 0, 0);
          console.log(`targetDate: ${targetDate.toISOString()} (${targetDate.toString()})`);

          for (const es of otherSchedules) {
            const esDate = new Date(es.eventDate);
            esDate.setHours(0, 0, 0, 0);
            console.log(`Comparing against event "${es.event ? es.event.eventName : 'N/A'}" on ${esDate.toISOString()} (${esDate.toString()})`);

            const diffTime = Math.abs(targetDate - esDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log(`diffTime: ${diffTime} ms, diffDays: ${diffDays}`);

            if (diffDays < 7) {
              console.log(`Validation Failed: Interval check failed (diffDays = ${diffDays} < 7)`);
              return res.status(400).json({
                success: false,
                error: `Ngày thứ ${i + 1}: Khoảng cách giữa các sự kiện cộng đồng (Public) của cùng một câu lạc bộ phải tối thiểu là 7 ngày.`
              });
            }
          }
        }
      }
    }

    console.log("Validation Successful!");
    return res.status(200).json({ success: true, message: "Lịch trình hợp lệ." });
  } catch (error) {
    console.error("Validation Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { create, getAll, getById, update, remove, validateSchedules };
