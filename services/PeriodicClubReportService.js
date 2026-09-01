const PeriodicClubReports = require("../models/PeriodicClubReport");
const Semesters = require("../models/Semester");
const Clubs = require("../models/Club");
const Events = require("../models/Event");
const ActiveMembers = require("../models/ActiveMember");
const UserClubs = require("../models/UserClub");
const Users = require("../models/User");
const Departments = require("../models/Department");

const createOne = async (data) => {
  const item = new PeriodicClubReports(data);
  return await item.save();
};

const getAll = async () => {
  return await PeriodicClubReports.find()
    .populate("club", "clubName")
    .populate("term", "termName");
};

const getById = async (id) => {
  return await PeriodicClubReports.findById(id)
    .populate("club", "clubName")
    .populate("term", "termName")
    .populate("eventsSummary.event", "eventName startDate participants")
    .populate("membersEvaluation.member", "fullName mssv")
    .populate("awards.member", "fullName mssv");
};

const updateById = async (id, data) => {
  return await PeriodicClubReports.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await PeriodicClubReports.findByIdAndDelete(id);
};

const getContext = async (clubId) => {
  // 1. Lấy Semester đang Active
  const activeSemester = await Semesters.findOne({ status: "ACTIVE" });
  if (!activeSemester) {
    throw new Error("Không tìm thấy học kỳ đang hoạt động");
  }

  // 2. Lấy thông tin Club
  const club = await Clubs.findById(clubId);
  if (!club) {
    throw new Error("Không tìm thấy thông tin Câu lạc bộ");
  }

  // 3. Query các Event của CLB trong học kỳ này có trạng thái "Completed"
  const rawEvents = await Events.find({
    club: clubId,
    semester: activeSemester._id,
    status: "Completed",
  });

  // Query kiểm tra xem đã có báo cáo nào cho kỳ này chưa
  const existingReport = await PeriodicClubReports.findOne({
    club: clubId,
    term: activeSemester._id,
  });
  
  const events = rawEvents.map(ev => {
    let proofUrl = "";
    if (existingReport && existingReport.eventsSummary) {
      const summaryItem = existingReport.eventsSummary.find(e => e.event.toString() === ev._id.toString());
      if (summaryItem) {
        proofUrl = summaryItem.proofUrl;
      }
    }
    return {
      id: ev._id,
      name: ev.eventName,
      date: ev.startDate || ev.createdAt, // just fallback
      participants: ev.participants?.length || 0,
      proofUrl
    };
  });

  // 4. Lấy danh sách thành viên từ ActiveMember (bảng chính)
  const activeMembers = await ActiveMembers.find({
    club: clubId,
    term: activeSemester._id,
  }).populate("user", "fullName mssv");

  // Để lấy thông tin chức vụ (role) và ban (department), ta query thêm UserClub
  // (Tìm những UserClub thuộc clubId và đang isActive)
  const userClubs = await UserClubs.find({
    club: clubId,
    isActive: true,
  }).populate("department", "departmentName");

  // Map lại để ghép Role và Department vào ActiveMember
  const members = activeMembers.map((am) => {
    const user = am.user;
    if (!user) return null;

    // Tìm record UserClub tương ứng với user
    const uc = userClubs.find(u => u.user.toString() === user._id.toString());
    
    let initialScore = am.progressPoint || 0;
    let initialNote = am.comment || "";
    
    if (existingReport && existingReport.membersEvaluation) {
      const evalItem = existingReport.membersEvaluation.find(e => e.member && e.member.toString() === user._id.toString());
      if (evalItem) {
        initialScore = evalItem.score;
        initialNote = evalItem.note;
      }
    }

    return {
      id: user._id,
      name: user.fullName || "N/A",
      mssv: user.mssv || "N/A",
      role: uc ? uc.role : "Thành viên",
      departmentName: uc && uc.department ? uc.department.departmentName : "N/A",
      initialScore,
      initialNote,
    };
  }).filter(Boolean); // Lọc bỏ những record null (nếu user bị xóa cứng)

  return {
    semester: {
      id: activeSemester._id,
      name: activeSemester.termName,
    },
    club: {
      id: club._id,
      name: club.clubName,
    },
    events,
    members,
    existingReportId: existingReport ? existingReport._id : null,
    awards: existingReport ? existingReport.awards : [],
  };
};

module.exports = { createOne, getAll, getById, updateById, deleteById, getContext };
