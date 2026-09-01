const UserClubs = require("../models/UserClub");

// The active membership (if any) a user holds in a club — single source of
// truth for the Chairman/Department-Head authorization split (UC27 BR-01):
// Chairman manages everything; Department Head only manages normal members
// within their own department.
const getMembership = async (userId, clubId) => {
  return UserClubs.findOne({ user: userId, club: clubId, isActive: true });
};

const isClubChairman = async (userId, clubId) => {
  const membership = await getMembership(userId, clubId);
  return !!membership && membership.role === "Chủ nhiệm";
};

// Chairman/Department-Head access split, shared by UserClub and Department
// stats/authorization checks.
const getAccess = async (userId, clubId) => {
  const membership = await getMembership(userId, clubId);
  if (!membership) return { isChairman: false, isDeptLead: false, departmentId: null };
  return {
    isChairman: membership.role === "Chủ nhiệm",
    isDeptLead: membership.role === "Trưởng ban",
    // Chủ nhiệm có thể không thuộc ban cụ thể nào (department = null) —
    // không được crash null.toString() ở đây vì mọi thao tác tài chính /
    // quản lý thành viên đều đi qua getAccess.
    departmentId: membership.department ? membership.department.toString() : null,
  };
};

module.exports = { getMembership, isClubChairman, getAccess };
