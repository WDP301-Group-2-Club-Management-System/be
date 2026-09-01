require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Event = require("../models/Event");
const EventTerm = require("../models/EventTerm");
const Task = require("../models/Task");
const Semester = require("../models/Semester");

async function seedData() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/wdp301");
  console.log("Connected to MongoDB");

  const clubId = "6a4a3a722aca2488b1cd7ffa";
  const deptId = "6a4a3a722aca2488b1cd7ffd";
  const truongBanId = "6a4a3a712aca2488b1cd7fdf";
  const thanhVien1 = "6a4a3a712aca2488b1cd7fe3";
  const thanhVien2 = "6a4a3a712aca2488b1cd7fe7";
  const thanhVien3 = "6a4a3a712aca2488b1cd7feb";

  let semester = await Semester.findOne({ termId: "SU26" });
  if (!semester) {
    semester = await Semester.create({
      termId: "SU26",
      termName: "Summer 2026",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-08-31"),
      status: "ACTIVE"
    });
    console.log("Created Semester SU26");
  }

  const newEvent = await Event.create({
    eventName: "Training BootCamp Thuật Toán Mùa Hè 2026",
    eventImg: "images/events/bootcamp2026.jpg",
    description: "Khóa huấn luyện thuật toán chuyên sâu dành cho thành viên chuẩn bị thi ICPC.",
    club: clubId,
    isPublic: false, 
    capacity: 50,
    status: "Pending", 
    approvalStatus: "APPROVED",
    semester: semester._id
  });
  console.log("Created Event:", newEvent.eventName);

  const termTruoc = await EventTerm.create({
    event: newEvent._id,
    termName: "Trước sự kiện",
    termStart: new Date("2026-08-01"),
    termEnd: new Date("2026-08-10")
  });
  const termTrong = await EventTerm.create({
    event: newEvent._id,
    termName: "Trong sự kiện",
    termStart: new Date("2026-08-11"),
    termEnd: new Date("2026-08-12")
  });

  const parentTaskTruoc = await Task.create({
    event: newEvent._id,
    term: termTruoc._id,
    club: clubId,
    assigneeType: "Department",
    department: deptId,
    title: "Chuẩn bị Giáo trình và Đề thi BootCamp",
    description: "Task tổng quản lý tiến độ làm giáo trình. Yêu cầu hoàn thành trước ngày 08/08.",
    status: "InProgress",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-08"),
    createdBy: truongBanId
  });

  await Task.insertMany([
    {
      parentTaskId: parentTaskTruoc._id,
      event: newEvent._id,
      term: termTruoc._id,
      club: clubId,
      assigneeType: "User",
      user: thanhVien1,
      title: "Viết Slide bài giảng: Quy Hoạch Động",
      status: "Done",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-04"),
      createdBy: truongBanId
    },
    {
      parentTaskId: parentTaskTruoc._id,
      event: newEvent._id,
      term: termTruoc._id,
      club: clubId,
      assigneeType: "User",
      user: thanhVien2,
      title: "Chuẩn bị 5 bài tập thực hành trên VNOI",
      status: "InProgress",
      startDate: new Date("2026-08-02"),
      endDate: new Date("2026-08-06"),
      createdBy: truongBanId
    },
    {
      parentTaskId: parentTaskTruoc._id,
      event: newEvent._id,
      term: termTruoc._id,
      club: clubId,
      assigneeType: "User",
      user: truongBanId,
      title: "Duyệt giáo án và Test bộ đề thi",
      status: "ToDo",
      startDate: new Date("2026-08-06"),
      endDate: new Date("2026-08-08"),
      createdBy: truongBanId
    }
  ]);

  const parentTaskTrong = await Task.create({
    event: newEvent._id,
    term: termTrong._id,
    club: clubId,
    assigneeType: "Department",
    department: deptId,
    title: "Hỗ trợ Kỹ thuật & Trợ giảng (TA)",
    description: "Task tổng quản lý công tác hỗ trợ học viên trong 2 ngày diễn ra BootCamp.",
    status: "ToDo",
    startDate: new Date("2026-08-11"),
    endDate: new Date("2026-08-12"),
    createdBy: truongBanId
  });

  await Task.create({
    parentTaskId: parentTaskTrong._id,
    event: newEvent._id,
    term: termTrong._id,
    club: clubId,
    assigneeType: "User",
    user: thanhVien3,
    title: "Làm TA - Hỗ trợ fix bug cho học viên",
    status: "ToDo",
    startDate: new Date("2026-08-11"),
    endDate: new Date("2026-08-12"),
    createdBy: truongBanId
  });

  console.log("Created Tasks successfully!");
  process.exit(0);
}
seedData().catch(console.error);
