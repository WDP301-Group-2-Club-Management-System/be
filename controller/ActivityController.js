const Clubs = require("../models/Club");
const UserClubs = require("../models/UserClub");
const Events = require("../models/Event");
const EventSchedules = require("../models/EventSchedule");

// UC: View Activity History — a user's own club applications + event
// participation, aggregated server-side and scoped to req.user so no other
// user's data is ever exposed (the FE used to fetch entire collections and
// filter client-side, plus always mixed in hardcoded mock rows).
const getMine = async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    const [createdClubs, memberships, events] = await Promise.all([
      Clubs.find({ contactGmail: email }),
      UserClubs.find({ user: userId }).populate("club"),
      Events.find({ "participants.user": userId }).populate("club"),
    ]);

    const clubApplications = [
      ...createdClubs.map((c) => ({
        id: c._id,
        type: "CREATE_CLUB",
        clubName: `Đơn thành lập: ${c.clubName}`,
        submitDate: c.createdAt,
        status:
          c.clubRequestStatus === "Pending"
            ? "PENDING"
            : c.clubRequestStatus === "Rejected"
              ? "REJECTED"
              : "APPROVED",
      })),
      ...memberships.map((m) => ({
        id: m._id,
        type: "JOIN_CLUB",
        clubName: `Đơn gia nhập: ${m.club?.clubName || "Câu lạc bộ"}`,
        submitDate: m.joinDate,
        status: m.isActive ? "APPROVED" : "PENDING",
      })),
    ].sort((a, b) => new Date(b.submitDate) - new Date(a.submitDate));

    const eventIds = events.map((e) => e._id);
    const schedules = await EventSchedules.find({ event: { $in: eventIds } }).populate("location");

    const participatedEvents = events.map((event) => {
      const participant = event.participants.find(
        (p) => p.user.toString() === userId
      );
      const schedule = schedules.find((s) => s.event.toString() === event._id.toString());
      return {
        eventId: event._id,
        eventName: event.eventName,
        clubName: event.club?.clubName || "Câu lạc bộ",
        eventDate: schedule?.eventDate || event.createdAt,
        locationName: schedule?.location?.locationName || null,
        participationStatus: participant?.status || "REGISTERED",
        eventStatus: event.status || "Pending",
      };
    });

    res.status(200).json({
      data: {
        clubApplications,
        events: participatedEvents,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const ActivityRegistrations = require("../models/ActivityRegistration");

const register = async (req, res) => {
  try {
    const { club, memberCount } = req.body;
    const file = req.file;

    if (!club) {
      return res.status(400).json({ error: "Thiếu ID câu lạc bộ." });
    }

    if (!file) {
      return res.status(400).json({ error: "Vui lòng tải lên Kế hoạch hoạt động." });
    }

    // Lấy tên file lưu trong server
    const planDocumentUrl = `/uploads/activity_plans/${file.filename}`;

    const newRegistration = new ActivityRegistrations({
      club,
      memberCount: parseInt(memberCount) || 0,
      planDocument: planDocumentUrl,
      status: "PENDING",
    });

    await newRegistration.save();

    res.status(201).json({
      message: "Đăng ký hoạt động thành công",
      data: newRegistration,
    });
  } catch (error) {
    console.error("Register Activity Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMine, register };
