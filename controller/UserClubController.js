const service = require("../services/UserClubService");
const UserClubs = require("../models/UserClub");
const Clubs = require("../models/Club");
const NotificationService = require("../services/NotificationService");
const { getAccess } = require("../utils/clubAuth");

// UC27 BR-01 — Chairman manages everything club-wide; a Department Head may
// only manage normal members within their own department (add/edit/remove),
// and may never assign/demote Chairman or Department Head roles themselves.
const canManageDepartment = (access, departmentId) =>
  access.isChairman || (access.isDeptLead && access.departmentId === departmentId);

const create = async (req, res) => {
  try {
    const { user, club, department, role, joinDate } = req.body;
    if (!user || !club || !department || !role) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc (thành viên, câu lạc bộ, ban, vai trò)." });
    }

    // Self-application (join-club flow on the Clubs page): a student may
    // submit a pending membership request FOR THEMSELVES — plain member
    // role, inactive until approved. Everything else (adding others,
    // active memberships, elevated roles) requires club-management rights.
    const isSelfApplication =
      user === req.user.id && role === "Thành viên" && req.body.isActive === false;

    if (!isSelfApplication) {
      const access = await getAccess(req.user.id, club);
      if (!canManageDepartment(access, department)) {
        return res.status(403).json({ error: "Bạn không có quyền thêm thành viên vào ban này." });
      }
      if (!access.isChairman && role !== "Thành viên") {
        return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền gán vai trò Trưởng ban/Chủ nhiệm." });
      }
    }

    // Duplicate membership check — an inactive row counts too when it's a
    // pending self-application (prevents submitting the same request twice).
    const existing = await UserClubs.findOne({ user, club });
    if (existing?.isActive) {
      return res.status(400).json({ error: "Người dùng này đã là thành viên của câu lạc bộ." });
    }
    if (existing && isSelfApplication) {
      return res.status(400).json({ error: "Bạn đã có đơn xin gia nhập đang chờ duyệt tại câu lạc bộ này." });
    }
    // Singleton-role checks (also guard the reactivation path below)
    if (role === "Chủ nhiệm") {
      const existingChairman = await UserClubs.findOne({ club, role: "Chủ nhiệm", isActive: true });
      if (existingChairman) return res.status(400).json({ error: "Câu lạc bộ đã có Chủ nhiệm." });
    }
    if (role === "Trưởng ban") {
      const existingLead = await UserClubs.findOne({ club, department, role: "Trưởng ban", isActive: true });
      if (existingLead) return res.status(400).json({ error: "Ban này đã có Trưởng ban." });
    }

    if (existing && !isSelfApplication) {
      // Manager re-adding a previously soft-deleted member: reactivate the
      // existing row instead of stacking a duplicate {user, club} document.
      const item = await service.updateById(existing._id, {
        department, role, joinDate: joinDate || new Date(), isActive: true,
      });

      // Send notification if club is available
      const clubDoc = await Clubs.findById(club);
      if (clubDoc) {
        await NotificationService.createOne({
          title: "Chào mừng thành viên mới!",
          content: `Bạn đã chính thức trở thành ${role} của Câu lạc bộ ${clubDoc.clubName}. Chúc bạn có những trải nghiệm tuyệt vời!`,
          receiver: user,
          sender: req.user.id,
          priority: "HIGH",
        });
      }

      return res.status(200).json({ message: "Thêm thành viên thành công!", data: item });
    }

    // Join-date validation
    const clubDoc = await Clubs.findById(club);
    if (!clubDoc) return res.status(404).json({ error: "Không tìm thấy câu lạc bộ." });
    const jd = joinDate ? new Date(joinDate) : new Date();
    if (clubDoc.establishedDate && jd < new Date(clubDoc.establishedDate)) {
      return res.status(400).json({ error: "Ngày gia nhập không được trước ngày thành lập câu lạc bộ." });
    }
    if (jd > new Date()) {
      return res.status(400).json({ error: "Ngày gia nhập không được ở tương lai." });
    }

    const item = await service.createOne({
      user, club, department, role, joinDate: jd,
      // Self-applications stay inactive until approved; manager-adds are
      // active immediately (schema default would otherwise force true).
      isActive: !isSelfApplication,
    });

    if (!isSelfApplication && clubDoc) {
      await NotificationService.createOne({
        title: "Chào mừng thành viên mới!",
        content: `Bạn đã chính thức trở thành ${role} của Câu lạc bộ ${clubDoc.clubName}. Chúc bạn có những trải nghiệm tuyệt vời!`,
        receiver: user,
        sender: req.user.id,
        priority: "HIGH",
      });
    }

    res.status(201).json({
      message: isSelfApplication
        ? "Đã gửi đơn xin gia nhập. Vui lòng chờ câu lạc bộ phê duyệt."
        : "Thêm thành viên thành công!",
      data: item,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.club) filter.club = req.query.club;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.includeInactive !== "true") filter.isActive = true;

    if (req.query.semesterId) {
      const ActiveMembers = require("../models/ActiveMember");
      const activeRecords = await ActiveMembers.find({
        term: req.query.semesterId,
        ...(req.query.club ? { club: req.query.club } : {}),
        isActive: true
      });
      const validUserIds = activeRecords.map(r => r.user);
      filter.user = { $in: validUserIds };
    }

    const items = await service.getAll(filter);
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
    const existing = await UserClubs.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const currentDepartment = existing.department ? existing.department.toString() : null;
    const access = await getAccess(req.user.id, existing.club);
    if (!canManageDepartment(access, currentDepartment)) {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa thành viên này." });
    }

    const { role, department } = req.body;
    if (!access.isChairman) {
      if (role && role !== "Thành viên") {
        return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền gán vai trò Trưởng ban/Chủ nhiệm." });
      }
      if (department && department !== currentDepartment) {
        return res.status(403).json({ error: "Bạn chỉ có thể quản lý thành viên trong ban của mình." });
      }
    }

    if (role === "Chủ nhiệm") {
      const existingChairman = await UserClubs.findOne({
        club: existing.club, role: "Chủ nhiệm", isActive: true, _id: { $ne: existing._id },
      });
      if (existingChairman) return res.status(400).json({ error: "Câu lạc bộ đã có Chủ nhiệm." });
    }
    if (role === "Trưởng ban") {
      const targetDepartment = department || currentDepartment;
      const existingLead = await UserClubs.findOne({
        club: existing.club, department: targetDepartment, role: "Trưởng ban", isActive: true, _id: { $ne: existing._id },
      });
      if (existingLead) return res.status(400).json({ error: "Ban này đã có Trưởng ban." });
    }

    const item = await service.updateById(req.params.id, req.body);
    res.status(200).json({ message: "Cập nhật thành viên thành công!", data: item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// UC27 BR-02 — soft-delete only: status flips to inactive, never removed
// from the database, so historical activity logs stay intact.
const remove = async (req, res) => {
  try {
    const existing = await UserClubs.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const access = await getAccess(req.user.id, existing.club);
    if (!canManageDepartment(access, existing.department ? existing.department.toString() : null)) {
      return res.status(403).json({ error: "Bạn không có quyền xóa thành viên này." });
    }
    if (existing.role === "Chủ nhiệm") {
      return res.status(400).json({ error: "Không thể xóa Chủ nhiệm khỏi câu lạc bộ." });
    }

    await service.updateById(req.params.id, { isActive: false });
    res.status(200).json({ message: "Đã xóa thành viên khỏi câu lạc bộ." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const swapChairman = async (req, res) => {
  try {
    const { club, targetUserClubId, targetUserId } = req.body;
    if (!club || (!targetUserClubId && !targetUserId)) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc (club và targetUserClubId hoặc targetUserId)." });
    }

    // 1. Kiểm tra quyền hạn của người gọi API (phải là Chủ nhiệm CLB hoặc Admin)
    const access = await getAccess(req.user.id, club);
    if (!access.isChairman && req.user.permission !== "Admin") {
      return res.status(403).json({ error: "Bạn không có quyền thực hiện chức năng này." });
    }

    // 2. Tìm hoặc tạo bản ghi UserClubs của thành viên nhận chức vụ
    let targetMember;
    if (targetUserClubId) {
      targetMember = await UserClubs.findOne({ _id: targetUserClubId, club, isActive: true });
    } else {
      targetMember = await UserClubs.findOne({ user: targetUserId, club });
      if (!targetMember) {
        const Departments = require("../models/Department");
        const defaultDept = await Departments.findOne({ club });
        if (!defaultDept) {
          return res.status(400).json({ error: "Câu lạc bộ chưa có ban chuyên môn nào để xếp thành viên." });
        }
        targetMember = new UserClubs({
          user: targetUserId,
          club,
          department: defaultDept._id,
          role: "Thành viên",
          isActive: true,
        });
        await targetMember.save();
      } else if (!targetMember.isActive) {
        targetMember.isActive = true;
        await targetMember.save();
      }
    }

    if (!targetMember) {
      return res.status(404).json({ error: "Không tìm thấy thành viên nhận bàn giao hoặc thành viên đã rời CLB." });
    }

    if (targetMember.role === "Chủ nhiệm") {
      return res.status(400).json({ error: "Thành viên này đã là Chủ nhiệm." });
    }

    // 3. Tìm Chủ nhiệm hiện tại của CLB
    const currentChairman = await UserClubs.findOne({
      club,
      role: "Chủ nhiệm",
      isActive: true,
    });

    // 4. Thực hiện swap vai trò
    if (currentChairman) {
      currentChairman.role = "Thành viên";
      await currentChairman.save();

      // Cập nhật phân quyền tài khoản của cựu chủ nhiệm về Student (nếu không làm chủ nhiệm CLB nào khác)
      const Users = require("../models/User");
      const stillChairmanOfOther = await UserClubs.findOne({
        user: currentChairman.user,
        role: "Chủ nhiệm",
        isActive: true,
        club: { $ne: club }
      });
      if (!stillChairmanOfOther) {
        await Users.findByIdAndUpdate(currentChairman.user, { permission: "Student" });
      }
    }

    targetMember.role = "Chủ nhiệm";
    targetMember.department = null; // Chủ nhiệm mới không thuộc ban chuyên môn nào
    await targetMember.save();

    // Cập nhật phân quyền tài khoản của chủ nhiệm mới thành Club_Chairman
    const Users = require("../models/User");
    await Users.findByIdAndUpdate(targetMember.user, { permission: "Club_Chairman" });

    // 5. Gửi thông báo đến Chủ nhiệm mới
    const clubDoc = await Clubs.findById(club);
    if (clubDoc) {
      await NotificationService.createOne({
        title: "Bàn giao chức vụ Chủ nhiệm",
        content: `Bạn đã được bàn giao làm Chủ nhiệm mới của Câu lạc bộ ${clubDoc.clubName}.`,
        receiver: targetMember.user,
        sender: req.user.id,
        priority: "HIGH",
      });
    }

    res.status(200).json({
      message: "Bàn giao quyền Chủ nhiệm thành công!",
      data: {
        oldChairman: currentChairman,
        newChairman: targetMember,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const swapDeptLead = async (req, res) => {
  try {
    const { club, targetUserClubId, targetUserId, department } = req.body;
    if (!club || (!targetUserClubId && !targetUserId)) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc (club và targetUserClubId hoặc targetUserId)." });
    }

    // 1. Tìm hoặc tạo bản ghi UserClubs của thành viên nhận chức vụ
    let targetMember;
    if (targetUserClubId) {
      targetMember = await UserClubs.findOne({ _id: targetUserClubId, club, isActive: true });
    } else {
      const targetDeptId = department;
      if (!targetDeptId) {
        return res.status(400).json({ error: "Vui lòng chọn Ban chuyên môn khi bàn giao chức vụ Trưởng ban." });
      }
      targetMember = await UserClubs.findOne({ user: targetUserId, club });
      if (!targetMember) {
        targetMember = new UserClubs({
          user: targetUserId,
          club,
          department: targetDeptId,
          role: "Thành viên",
          isActive: true,
        });
        await targetMember.save();
      } else {
        targetMember.department = targetDeptId;
        targetMember.isActive = true;
        await targetMember.save();
      }
    }

    if (!targetMember) {
      return res.status(404).json({ error: "Không tìm thấy thành viên nhận bàn giao hoặc thành viên đã rời CLB." });
    }

    if (targetMember.role === "Chủ nhiệm") {
      return res.status(400).json({ error: "Không thể bàn giao chức Trưởng ban cho Chủ nhiệm." });
    }

    if (targetMember.role === "Trưởng ban") {
      return res.status(400).json({ error: "Thành viên này đã là Trưởng ban." });
    }

    const deptId = targetMember.department;

    // 2. Tìm Trưởng ban hiện tại của ban đó
    const currentLead = await UserClubs.findOne({
      club,
      department: deptId,
      role: "Trưởng ban",
      isActive: true,
    });

    // 3. Kiểm tra quyền hạn của người gọi API:
    // Phải là Chủ nhiệm CLB HOẶC Admin HOẶC chính là Trưởng ban hiện tại của ban đó
    const access = await getAccess(req.user.id, club);
    const isSelfLead = currentLead && currentLead.user.toString() === req.user.id;

    if (!access.isChairman && !isSelfLead && req.user.permission !== "Admin") {
      return res.status(403).json({ error: "Bạn không có quyền bàn giao chức Trưởng ban này." });
    }

    // 4. Thực hiện swap vai trò
    if (currentLead) {
      currentLead.role = "Thành viên";
      await currentLead.save();

      // Cập nhật phân quyền tài khoản của cựu trưởng ban về Student (nếu không giữ chức trưởng ban/chủ nhiệm khác)
      const Users = require("../models/User");
      const stillLeadOrChairmanOfOther = await UserClubs.findOne({
        user: currentLead.user,
        role: { $in: ["Chủ nhiệm", "Trưởng ban"] },
        isActive: true,
        _id: { $ne: currentLead._id }
      });
      if (!stillLeadOrChairmanOfOther) {
        await Users.findByIdAndUpdate(currentLead.user, { permission: "Student" });
      }
    }

    targetMember.role = "Trưởng ban";
    await targetMember.save();

    // Cập nhật phân quyền tài khoản của trưởng ban mới thành Dept_Leader
    const Users = require("../models/User");
    const targetUser = await Users.findById(targetMember.user);
    if (targetUser && targetUser.permission === "Student") {
      targetUser.permission = "Dept_Leader";
      await targetUser.save();
    }

    // 5. Gửi thông báo đến Trưởng ban mới
    const clubDoc = await Clubs.findById(club);
    const Department = require("../models/Department");
    const deptDoc = await Department.findById(deptId);
    const deptName = deptDoc ? deptDoc.departmentName : "ban chuyên môn";
    if (clubDoc) {
      await NotificationService.createOne({
        title: "Bàn giao chức vụ Trưởng ban",
        content: `Bạn đã được bàn giao làm Trưởng ban của ban "${deptName}" thuộc Câu lạc bộ ${clubDoc.clubName}.`,
        receiver: targetMember.user,
        sender: req.user.id,
        priority: "HIGH",
      });
    }

    res.status(200).json({
      message: "Bàn giao quyền Trưởng ban thành công!",
      data: {
        oldLead: currentLead,
        newLead: targetMember,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { create, getAll, getById, update, remove, swapChairman, swapDeptLead };
