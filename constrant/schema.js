// constrant/schema.js - CommonJS format

const SEMESTER_STATUS = ["ACTIVE", "INACTIVE", "ENDED"];

const USER_PERMISSIONS = [
  "Student",
  "Admin",
  "PDP_Officer",
  "Club_Chairman",
  "Dept_Leader",
];

const CLUB_ROLES = ["Chủ nhiệm", "Trưởng ban", "Thành viên"];

const CLUB_CATEGORIES = ["Học thuật", "Phong trào", "Thể thao"];

const CLUB_REQUEST_STATUS = ["Pending", "Rejected", "Approved"];

const CLUB_REQUEST_TYPE = ["Create", "Update"];

const CLUB_APPROVAL_ACTION = ["Pending", "Approved", "Rejected"];

const EVENT_LOCATION_TYPE = ["OnCampus", "OffCampus"];

const EVENT_STATUS = ["Pending", "Processing", "Completed"];

const APPROVAL_STATUS = ["PENDING", "APPROVED_FOR_DEFENSE", "APPROVED", "REJECTED"];

const EVENT_PARTICIPANT_STATUS = ["REGISTERED", "ATTENDED", "ABSENT"];

const DOCUMENT_TYPE = ["Meeting", "Tasks", "Proposal", "Event"];

const EVENT_TERM_NAME = ["Trước sự kiện", "Trong sự kiện", "Sau sự kiện"];

const TASK_ASSIGNEE_TYPE = ["User", "Department"];

const TASK_STATUS = ["ToDo", "Review", "Rejected", "Done"];

const TASK_RATING = ["Positive", "Neutral", "Negative"];

const NOTIFICATION_PRIORITY = ["LOW", "MEDIUM", "HIGH"];

const NOTIFICATION_STATUS = ["UNREAD", "READ"];

const EXPENSE_PURPOSE = ["Sự kiện", "Vật tư", "Thuê địa điểm", "Khác"];

const TRANSACTION_STATUS = ["Pending", "Approved", "Rejected"];

const INCOME_SOURCE = [
  "Phí thành viên",
  "Tài trợ",
  "Doanh thu sự kiện",
  "Khác",
];

const INCOME_STATUS = ["Đã nhận", "Đang chờ", "Quá hạn"];

const TRANSACTION_TYPE = ["Income", "Expense"];

// "Exempted" kept for schema fidelity with the old system's
// MemberIncomeContributions.ContributionStatus — no exemption flow is built
// (deliberately dropped from the new scope).
const CONTRIBUTION_STATUS = ["Pending", "Paid", "Exempted"];

const PAYMENT_METHOD = ["PAYOS", "Cash"];

const RECRUITMENT_STATUS = ["DRAFT", "OPEN", "CLOSED"];

module.exports = {
  SEMESTER_STATUS,
  USER_PERMISSIONS,
  CLUB_ROLES,
  CLUB_CATEGORIES,
  CLUB_REQUEST_STATUS,
  CLUB_REQUEST_TYPE,
  CLUB_APPROVAL_ACTION,
  EVENT_LOCATION_TYPE,
  EVENT_STATUS,
  APPROVAL_STATUS,
  EVENT_PARTICIPANT_STATUS,
  DOCUMENT_TYPE,
  EVENT_TERM_NAME,
  TASK_ASSIGNEE_TYPE,
  TASK_STATUS,
  TASK_RATING,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_STATUS,
  EXPENSE_PURPOSE,
  TRANSACTION_STATUS,
  INCOME_SOURCE,
  INCOME_STATUS,
  TRANSACTION_TYPE,
  CONTRIBUTION_STATUS,
  PAYMENT_METHOD,
  RECRUITMENT_STATUS,
};
