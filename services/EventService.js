const Events = require("../models/Event");
const EventSchedules = require("../models/EventSchedule");
const EventTerms = require("../models/EventTerm");
const Semesters = require("../models/Semester");

const createOne = async (data) => {
  // 1. Tự động gán học kỳ Active
  const activeSemester = await Semesters.findOne({ status: "ACTIVE" });
  if (!activeSemester) {
    throw new Error("Không tìm thấy học kỳ nào đang ACTIVE để tạo sự kiện.");
  }
  data.semester = activeSemester._id;

  // 2. Kiểm tra giới hạn số lượng sự kiện của CLB trong học kỳ
  const query = {
    club: data.club,
    semester: activeSemester._id,
    approvalStatus: { $ne: "REJECTED" }
  };
  const existingEvents = await Events.find(query);
  const publicCount = existingEvents.filter(e => e.isPublic === true).length;
  const privateCount = existingEvents.filter(e => e.isPublic === false).length;

  if (data.isPublic === true && publicCount >= 2) {
    throw new Error("Câu lạc bộ đã đạt giới hạn tối đa 2 sự kiện cộng đồng (Public) trong học kỳ này.");
  }
  if (data.isPublic === false && privateCount >= 3) {
    throw new Error("Câu lạc bộ đã đạt giới hạn tối đa 3 sự kiện nội bộ (Private) trong học kỳ này.");
  }

  const item = new Events(data);
  return await item.save();
};

const getAll = async (filter = {}) => {
  return await Events.find(filter)
    .populate("club", "clubName")
    .populate("semester", "termName")
    .populate("participants.user", "fullName email userId");
};

const getById = async (id) => {
  return await Events.findById(id)
    .populate("club", "clubName")
    .populate("semester", "termName")
    .populate("participants.user", "fullName email userId");
};

const updateById = async (id, data) => {
  // Nếu cập nhật trạng thái isPublic, cần kiểm tra lại giới hạn số lượng
  if (data.isPublic !== undefined) {
    const existingEvent = await Events.findById(id);
    if (existingEvent && existingEvent.isPublic !== data.isPublic) {
      const activeSemester = await Semesters.findOne({ status: "ACTIVE" });
      if (activeSemester) {
        const query = {
          club: existingEvent.club,
          semester: activeSemester._id,
          approvalStatus: { $ne: "REJECTED" },
          _id: { $ne: id }
        };
        const existingEvents = await Events.find(query);
        const publicCount = existingEvents.filter(e => e.isPublic === true).length;
        const privateCount = existingEvents.filter(e => e.isPublic === false).length;

        if (data.isPublic === true && publicCount >= 2) {
          throw new Error("Câu lạc bộ đã đạt giới hạn tối đa 2 sự kiện cộng đồng (Public) trong học kỳ này.");
        }
        if (data.isPublic === false && privateCount >= 3) {
          throw new Error("Câu lạc bộ đã đạt giới hạn tối đa 3 sự kiện nội bộ (Private) trong học kỳ này.");
        }
      }
    }
  }

  const updatedEvent = await Events.findByIdAndUpdate(id, data, { new: true });
  
  if (updatedEvent && data.approvalStatus === "APPROVED") {
    await autoCreateEventTerms(id);
  }
  
  return updatedEvent;
};

const autoCreateEventTerms = async (eventId) => {
  // 1. Kiểm tra xem đã tồn tại EventTerms cho sự kiện này chưa
  const existingTerms = await EventTerms.findOne({ event: eventId });
  if (existingTerms) {
    return; // Đã tồn tại, bỏ qua để tránh trùng lặp
  }

  // 2. Tìm tất cả lịch trình của sự kiện
  const schedules = await EventSchedules.find({ event: eventId });
  if (!schedules || schedules.length === 0) {
    console.warn(`[EventService] Không tìm thấy lịch trình cho sự kiện ${eventId}. Không thể tự động tạo EventTerms.`);
    return;
  }

  // 3. Lấy ra danh sách các ngày và sắp xếp từ nhỏ đến lớn
  const dates = schedules
    .map(s => new Date(s.eventDate))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (dates.length === 0) {
    console.warn(`[EventService] Không có ngày hợp lệ trong lịch trình của sự kiện ${eventId}.`);
    return;
  }

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  // 4. Tính toán thời gian cho từng giai đoạn
  // Trước sự kiện:
  // - Bắt đầu: Thời điểm hiện tại (lúc duyệt)
  // - Kết thúc: Cuối ngày trước ngày đầu tiên diễn ra sự kiện (23:59:59.999)
  const termBeforeStart = new Date();
  
  const termBeforeEnd = new Date(minDate);
  termBeforeEnd.setDate(termBeforeEnd.getDate() - 1);
  termBeforeEnd.setHours(23, 59, 59, 999);

  // Trong sự kiện:
  // - Bắt đầu: Đầu ngày diễn ra sự kiện đầu tiên (00:00:00.000)
  // - Kết thúc: Cuối ngày diễn ra sự kiện cuối cùng (23:59:59.999)
  const termDuringStart = new Date(minDate);
  termDuringStart.setHours(0, 0, 0, 0);

  const termDuringEnd = new Date(maxDate);
  termDuringEnd.setHours(23, 59, 59, 999);

  // Sau sự kiện:
  // - Bắt đầu: Ngày tiếp theo sau ngày kết thúc sự kiện (00:00:00.000)
  // - Kết thúc: null (Chủ nhiệm tự set)
  const termAfterStart = new Date(maxDate);
  termAfterStart.setDate(termAfterStart.getDate() + 1);
  termAfterStart.setHours(0, 0, 0, 0);

  // 5. Lưu vào database
  await EventTerms.create([
    {
      event: eventId,
      termName: "Trước sự kiện",
      termStart: termBeforeStart,
      termEnd: termBeforeEnd,
    },
    {
      event: eventId,
      termName: "Trong sự kiện",
      termStart: termDuringStart,
      termEnd: termDuringEnd,
    },
    {
      event: eventId,
      termName: "Sau sự kiện",
      termStart: termAfterStart,
      termEnd: null,
    },
  ]);
};

const deleteById = async (id) => {
  return await Events.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
