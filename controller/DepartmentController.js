const service = require("../services/DepartmentService");
const Departments = require("../models/Department");
const UserClubs = require("../models/UserClub");
const Tasks = require("../models/Task");
const Events = require("../models/Event");
const { isClubChairman, getAccess } = require("../utils/clubAuth");

const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

const findDuplicateName = async (club, departmentName, excludeId) => {
  const filter = {
    club,
    departmentName: { $regex: new RegExp("^" + escapeRegex(departmentName.trim()) + "$", "i") },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Departments.findOne(filter);
};

// Only the Club Chairman can create/edit/delete departments (UC27 BR-01 —
// Department Heads may only manage members within their own department,
// not the department structure itself).
const create = async (req, res) => {
  try {
    const { departmentName, club, description } = req.body;
    if (!departmentName || !departmentName.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập tên ban chuyên môn." });
    }
    if (!club) {
      return res.status(400).json({ error: "Thiếu thông tin câu lạc bộ." });
    }
    if (!(await isClubChairman(req.user.id, club))) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền tạo ban chuyên môn." });
    }

    const duplicate = await findDuplicateName(club, departmentName);
    if (duplicate) {
      return res.status(400).json({ error: "Tên ban chuyên môn này đã tồn tại trong câu lạc bộ." });
    }

    const item = await service.createOne({ departmentName: departmentName.trim(), club, description });
    res.status(201).json({ message: "Tạo ban chuyên môn thành công!", data: item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Scoped by club — previously returned every department in the system to
// every club's UI since Department had no club field to filter on at all.
const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.club) filter.club = req.query.club;
    const items = await Departments.find(filter);
    res.status(200).json({ data: items });
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
    const existing = await Departments.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!(await isClubChairman(req.user.id, existing.club))) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền sửa ban chuyên môn." });
    }

    const { departmentName } = req.body;
    if (departmentName && departmentName.trim()) {
      const duplicate = await findDuplicateName(existing.club, departmentName, existing._id);
      if (duplicate) {
        return res.status(400).json({ error: "Tên ban chuyên môn này đã tồn tại trong câu lạc bộ." });
      }
    }

    const item = await service.updateById(req.params.id, req.body);
    res.status(200).json({ message: "Cập nhật ban chuyên môn thành công!", data: item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// UC27 BR-03: block delete while any active member still belongs to it.
const remove = async (req, res) => {
  try {
    const existing = await Departments.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!(await isClubChairman(req.user.id, existing.club))) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền xóa ban chuyên môn." });
    }

    const activeMemberCount = await UserClubs.countDocuments({ department: req.params.id, isActive: true });
    if (activeMemberCount > 0) {
      return res.status(400).json({
        error: "Không thể xóa ban chuyên môn còn thành viên đang hoạt động. Vui lòng chuyển thành viên sang ban khác trước.",
      });
    }

    await service.deleteById(req.params.id);
    res.status(200).json({ message: "Xóa ban chuyên môn thành công!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC17 BR-01 — a Department Head sees only their own department's dashboard;
// the Chairman may view any department within their own club.
const getStats = async (req, res) => {
  try {
    const dept = await Departments.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: "Not found" });

    const access = await getAccess(req.user.id, dept.club);
    const isOwnDeptLead = access.isDeptLead && access.departmentId === dept._id.toString();
    if (!access.isChairman && !isOwnDeptLead) {
      return res.status(403).json({ error: "Bạn không có quyền xem dashboard của ban này." });
    }

    const [totalMembers, activeMembers, tasks] = await Promise.all([
      UserClubs.countDocuments({ department: dept._id }),
      UserClubs.countDocuments({ department: dept._id, isActive: true }),
      Tasks.find({ club: dept.club, department: dept._id, assigneeType: "Department" }),
    ]);

    const taskStats = {
      total: tasks.length,
      done: tasks.filter((t) => t.status === "Done").length,
      inProgress: tasks.filter((t) => t.status === "InProgress" || t.status === "Review").length,
      todo: tasks.filter((t) => t.status === "ToDo").length,
      rejected: tasks.filter((t) => t.status === "Rejected").length,
    };

    const eventIds = [...new Set(tasks.filter((t) => t.event).map((t) => t.event.toString()))];
    const events = eventIds.length > 0 ? await Events.find({ _id: { $in: eventIds } }) : [];
    const eventStats = {
      total: events.length,
      completed: events.filter((e) => e.status === "Completed").length,
      upcoming: events.filter((e) => e.status !== "Completed").length,
    };

    res.status(200).json({
      data: {
        departmentId: dept._id,
        departmentName: dept.departmentName,
        memberStats: {
          total: totalMembers,
          active: activeMembers,
          inactive: totalMembers - activeMembers,
        },
        taskStats,
        eventStats,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { create, getAll, getById, update, remove, getStats };
