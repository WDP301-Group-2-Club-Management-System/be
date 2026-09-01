const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const CLUB_LOGO_DIR = path.join(__dirname, "..", "uploads", "clubs");
fs.mkdirSync(CLUB_LOGO_DIR, { recursive: true });

const ACTIVITY_PLAN_DIR = path.join(__dirname, "..", "uploads", "activity_plans");
fs.mkdirSync(ACTIVITY_PLAN_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const ALLOWED_DOC_EXTENSIONS = [".pdf", ".doc", ".docx"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CLUB_LOGO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!file.mimetype.startsWith("image/") || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error("Chỉ chấp nhận tệp ảnh (jpg, jpeg, png, gif, webp)."));
  }
  cb(null, true);
};

const uploadClubLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const planStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ACTIVITY_PLAN_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const planFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
    return cb(new Error("Chỉ chấp nhận tệp tài liệu (pdf, doc, docx)."));
  }
  cb(null, true);
};

const uploadActivityPlan = multer({
  storage: planStorage,
  fileFilter: planFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

module.exports = { uploadClubLogo, uploadActivityPlan };
