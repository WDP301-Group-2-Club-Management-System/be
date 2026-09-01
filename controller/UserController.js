const service = require("../services/UserService");
const { signToken } = require("../utils/jwt");
const { sendVerificationEmail, sendResetPasswordEmail } = require("../utils/email");

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// FPT student ID format: 2 letters + 6 digits, e.g. SE160001
const STUDENT_ID_PATTERN = /^[A-Za-z]{2}\d{6}$/;

// Verify a Google access token by calling Google's userinfo endpoint and
// return the profile it belongs to. Never trust client-supplied email/name —
// this is the only source of truth for "which Google account is this".
const verifyGoogleAccessToken = async (googleAccessToken) => {
  const fetch = require('node-fetch');
  const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  });
  if (!googleRes.ok) return null;
  const googleUser = await googleRes.json();
  if (!googleUser.email) return null;
  return {
    email: googleUser.email,
    fullName: googleUser.name || googleUser.given_name || '',
    avatarUrl: googleUser.picture || '',
  };
};

// Helper: Map DB permission value → FE role constant
const mapPermissionToRole = (permission) => {
  const roleMap = {
    "Admin": "ADMIN",
    "PDP_Officer": "PDP_STAFF",
    "Club_Chairman": "CLUB_CHAIRMAN",
    "Dept_Leader": "DEPT_LEADER",
    "Student": "STUDENT",
  };
  return roleMap[permission] || "STUDENT";
};

// Helper: map a permission value to the FE-facing systemRole contract
// (REQUIRE_LOGIN.md: 'admin' | 'pdp-officer' | 'student')
const mapPermissionToSystemRole = (permission) => {
  if (permission === "Admin") return "admin";
  if (permission === "PDP_Officer") return "pdp-officer";
  return "student";
};

// Helper: translate raw Mongo/Mongoose errors into a friendly Vietnamese
// message instead of leaking driver internals (e.g. duplicate-key errors
// used to surface as "E11000 duplicate key error collection: ... index:
// email_1 dup key: { email: ... }" straight to the register screen).
const formatUserError = (error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
    if (field === "email") return "Email này đã được sử dụng. Vui lòng chọn email khác.";
    if (field === "userId") return "Mã người dùng này đã tồn tại. Vui lòng thử lại.";
    return "Thông tin bạn nhập đã tồn tại trong hệ thống.";
  }
  if (error.name === "ValidationError") {
    const firstError = Object.values(error.errors)[0];
    return firstError?.message || "Dữ liệu nhập không hợp lệ. Vui lòng kiểm tra lại.";
  }
  return error.message;
};

// Helper: build the real (possibly empty) clubMemberships array for a user.
// No fake/fallback data — an empty array is a valid response per REQUIRE_LOGIN.md.
const buildClubMemberships = async (userId) => {
  const UserClubs = require("../models/UserClub");
  const memberships = await UserClubs.find({ user: userId, isActive: true })
    .populate("club")
    .populate("department");

  return memberships.map((m) => {
    let roleName = "MEMBER";
    if (m.role === "Chủ nhiệm") roleName = "CHAIRMAN";
    else if (m.role === "Trưởng ban") roleName = "DEPARTMENT_LEADER";
    return {
      clubId: m.club?._id?.toString() || null,
      clubRole: roleName,
      clubName: m.club?.clubName || null,
      clubRequestStatus: m.club?.clubRequestStatus || null,
      departmentId: m.department?._id?.toString() || null,
      departmentName: m.department?.departmentName || null,
    };
  });
};

const create = async (req, res) => {
  try {
    const { email, fullName, password, userId } = req.body;
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập họ và tên." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập email." });
    }
    if (!password) {
      return res.status(400).json({ error: "Vui lòng nhập mật khẩu." });
    }
    if (password.length < 6 || password.length > 50) {
      return res.status(400).json({ error: "Mật khẩu phải từ 6 đến 50 ký tự." });
    }
    if (!userId || !userId.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập mã số sinh viên." });
    }
    const trimmedUserId = userId.trim().toUpperCase();
    if (!STUDENT_ID_PATTERN.test(trimmedUserId)) {
      return res.status(400).json({ error: "Mã số sinh viên không đúng định dạng (VD: SE160001)." });
    }
    req.body.userId = trimmedUserId;

    // Check duplicate email/studentId up front so the common case gets a
    // clean 400 with a friendly message rather than relying on the driver's
    // raw duplicate-key error every time.
    const existing = await service.getByEmail(email.trim());
    if (existing) {
      return res.status(400).json({ error: "Email này đã được sử dụng. Vui lòng chọn email khác." });
    }
    const existingUserId = await service.getByUserId(trimmedUserId);
    if (existingUserId) {
      return res.status(400).json({ error: "Mã số sinh viên này đã được đăng ký." });
    }

    const bcrypt = require('bcryptjs');
    req.body.password = await bcrypt.hash(password, 10);

    // New self-registered accounts must verify their email via OTP before
    // they can log in (see `login`'s isVerified === false check).
    const verifyToken = generateOtp();
    const verifyTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    req.body.isVerified = false;
    req.body.verifyToken = verifyToken;
    req.body.verifyTokenExpiry = verifyTokenExpiry;

    const item = await service.createOne(req.body);
    await sendVerificationEmail(item.email, verifyToken);

    res.status(201).json({
      message: "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã xác thực tài khoản.",
      data: { _id: item._id, email: item.email },
    });
  } catch (error) {
    res.status(400).json({ error: formatUserError(error) });
  }
};

const verifyAccount = async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ error: "Vui lòng nhập email và mã xác thực." });
    }
    const user = await service.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Email này chưa được đăng ký trong hệ thống." });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: "Tài khoản này đã được xác thực trước đó." });
    }
    if (user.verifyToken !== token) {
      return res.status(400).json({ error: "Mã xác thực không đúng. Vui lòng kiểm tra lại." });
    }
    if (!user.verifyTokenExpiry || new Date() > user.verifyTokenExpiry) {
      return res.status(400).json({ error: "Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại." });
    }

    await service.updateById(user._id, {
      isVerified: true,
      verifyToken: null,
      verifyTokenExpiry: null,
    });

    res.status(200).json({ message: "Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Vui lòng nhập email." });
    }
    const user = await service.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Email này chưa được đăng ký trong hệ thống." });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: "Tài khoản này đã được xác thực trước đó." });
    }

    const verifyToken = generateOtp();
    const verifyTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await service.updateById(user._id, { verifyToken, verifyTokenExpiry });
    await sendVerificationEmail(user.email, verifyToken);

    res.status(200).json({ message: "Mã xác thực mới đã được gửi. Vui lòng kiểm tra email của bạn." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const items = await service.getAll();
    const UserClubs = require("../models/UserClub");
    
    // Nạp thêm danh sách câu lạc bộ tham gia cho mỗi tài khoản
    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const memberships = await UserClubs.find({ user: item._id, isActive: true })
          .populate("club")
          .populate("department")
          .select("club department role");
        
        const userObj = item.toObject();
        userObj.clubMemberships = memberships.map(m => ({
          clubId: m.club?._id?.toString() || null,
          clubName: m.club?.clubName || "N/A",
          departmentId: m.department?._id?.toString() || null,
          departmentName: m.department?.departmentName || null,
          role: m.role || "Thành viên"
        }));
        return userObj;
      })
    );

    res.status(200).json({ data: populatedItems });
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
    if (req.body.password) {
      const bcrypt = require('bcryptjs');
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }
    const item = await service.updateById(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Cập nhật thành công!", data: item });
  } catch (error) {
    res.status(400).json({ error: formatUserError(error) });
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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
    }
    const user = await service.getByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
    }

    // ✅ Compare hashed password using bcrypt
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
    }

    // Strict === false: pre-existing accounts have no isVerified field set
    // and read back as undefined, which must NOT be treated as unverified —
    // only accounts explicitly registered through `create` (isVerified:false)
    // should ever be blocked here.
    if (user.isVerified === false) {
      return res.status(403).json({
        error: "Tài khoản chưa được xác thực. Vui lòng kiểm tra email để lấy mã xác thực.",
        code: "NOT_VERIFIED",
      });
    }

    if (!user.status) {
      return res.status(403).json({ error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." });
    }

    const token = signToken({ sub: user._id.toString(), permission: user.permission });
    const systemRole = mapPermissionToSystemRole(user.permission);
    const clubMemberships = await buildClubMemberships(user._id);

    res.status(200).json({
      status: 200,
      message: "Login successful",
      data: {
        token,
        expiredAt: Date.now() + 24 * 60 * 60 * 1000,
        userInfo: {
          _id: user._id.toString(),
          username: user.userId,
          fullName: user.fullName,
          avatar: user.avatarSrc || "",
          systemRole,
          clubMemberships,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Vui lòng nhập email." });
    }
    const user = await service.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Email này chưa được đăng ký trong hệ thống." });
    }

    // Generate a 6-digit OTP token
    const resetToken = generateOtp();
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await service.updateById(user._id, { resetToken, tokenExpiry });
    const { sent } = await sendResetPasswordEmail(user.email, resetToken);

    const response = { message: "Mã xác nhận đã được gửi. Vui lòng kiểm tra email của bạn." };
    // Fallback for local dev when SMTP isn't configured yet — never expose
    // this once real email delivery works, since it would let anyone who
    // knows an email take over that account.
    if (!sent && process.env.NODE_ENV !== "production") {
      response.devToken = resetToken;
    }
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ email, mã xác nhận và mật khẩu mới." });
    }
    if (newPassword.length < 6 || newPassword.length > 50) {
      return res.status(400).json({ error: "Mật khẩu phải từ 6 đến 50 ký tự." });
    }

    const user = await service.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Email này chưa được đăng ký trong hệ thống." });
    }

    // Validate token
    if (user.resetToken !== token) {
      return res.status(400).json({ error: "Mã xác nhận không đúng. Vui lòng kiểm tra lại." });
    }
    if (!user.tokenExpiry || new Date() > user.tokenExpiry) {
      return res.status(400).json({ error: "Mã xác nhận đã hết hạn. Vui lòng yêu cầu lại." });
    }

    // Update password and clear token
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await service.updateById(user._id, {
      password: hashedPassword,
      resetToken: null,
      tokenExpiry: null,
    });

    res.status(200).json({ message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { googleAccessToken } = req.body;

    if (!googleAccessToken) {
      return res.status(400).json({ error: "Thiếu thông tin xác thực Google. Vui lòng thử đăng nhập lại." });
    }

    const googleProfile = await verifyGoogleAccessToken(googleAccessToken);
    if (!googleProfile) {
      return res.status(401).json({ error: "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại." });
    }
    const { email, fullName, avatarUrl } = googleProfile;

    let user = await service.getByEmail(email);

    if (!user) {
      // One-student-one-account is anchored on a real student ID, which
      // Google doesn't provide — defer creating the account until the user
      // supplies one via the Complete Profile step instead of guessing one.
      return res.status(200).json({
        needsProfileCompletion: true,
        data: { email, fullName, avatarUrl },
      });
    }

    if (avatarUrl && !user.avatarSrc) {
      // Update avatar if user exists but doesn't have one
      try {
        await service.updateById(user._id, { avatarSrc: avatarUrl });
        user.avatarSrc = avatarUrl;
      } catch (e) {
        console.error("Error updating avatar:", e);
      }
    }

    if (!user.status) {
      return res.status(403).json({ error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." });
    }

    const token = signToken({ sub: user._id.toString(), permission: user.permission });
    const systemRole = mapPermissionToSystemRole(user.permission);
    const clubMemberships = await buildClubMemberships(user._id);

    res.status(200).json({
      status: 200,
      message: "Đăng nhập Google thành công!",
      data: {
        token,
        expiredAt: Date.now() + 24 * 60 * 60 * 1000,
        userInfo: {
          _id: user._id.toString(),
          username: user.userId,
          fullName: user.fullName,
          avatar: user.avatarSrc || avatarUrl || "",
          systemRole,
          clubMemberships,
        }
      }
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ error: error.message });
  }
};

const completeGoogleProfile = async (req, res) => {
  try {
    const { googleAccessToken, userId, dateOfBirth } = req.body;

    if (!googleAccessToken) {
      return res.status(400).json({ error: "Thiếu thông tin xác thực Google. Vui lòng thử đăng nhập lại." });
    }
    if (!userId || !userId.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập mã số sinh viên." });
    }
    const trimmedUserId = userId.trim().toUpperCase();
    if (!STUDENT_ID_PATTERN.test(trimmedUserId)) {
      return res.status(400).json({ error: "Mã số sinh viên không đúng định dạng (VD: SE160001)." });
    }

    // Re-verify the token server-side rather than trusting client-supplied
    // email/name — prevents completing a profile under a spoofed identity.
    const googleProfile = await verifyGoogleAccessToken(googleAccessToken);
    if (!googleProfile) {
      return res.status(401).json({ error: "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại." });
    }
    const { email, fullName, avatarUrl } = googleProfile;

    const existingByEmail = await service.getByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({ error: "Email này đã có tài khoản. Vui lòng đăng nhập lại." });
    }
    const existingUserId = await service.getByUserId(trimmedUserId);
    if (existingUserId) {
      return res.status(400).json({ error: "Mã số sinh viên này đã được đăng ký." });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash("google-auth-" + Date.now(), 10);

    const user = await service.createOne({
      userId: trimmedUserId,
      fullName: fullName || trimmedUserId,
      email,
      password: hashedPassword,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      permission: "Student",
      status: true,
      isVerified: true, // Google already verified ownership of this email
      avatarSrc: avatarUrl,
    });

    const token = signToken({ sub: user._id.toString(), permission: user.permission });
    const systemRole = mapPermissionToSystemRole(user.permission);
    const clubMemberships = await buildClubMemberships(user._id);

    res.status(200).json({
      status: 200,
      message: "Hoàn tất hồ sơ và đăng nhập thành công!",
      data: {
        token,
        expiredAt: Date.now() + 24 * 60 * 60 * 1000,
        userInfo: {
          _id: user._id.toString(),
          username: user.userId,
          fullName: user.fullName,
          avatar: user.avatarSrc || avatarUrl || "",
          systemRole,
          clubMemberships,
        }
      }
    });
  } catch (error) {
    console.error("Complete Google profile error:", error);
    res.status(400).json({ error: formatUserError(error) });
  }
};

const createPdpStaff = async (req, res) => {
  try {
    const { email, fullName, password, userId } = req.body;
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập họ và tên." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập email." });
    }
    if (!password) {
      return res.status(400).json({ error: "Vui lòng nhập mật khẩu." });
    }
    if (!userId || !userId.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập mã nhân viên." });
    }
    const trimmedUserId = userId.trim().toUpperCase();
    
    // Check duplicate email / employee ID
    const existing = await service.getByEmail(email.trim());
    if (existing) {
      return res.status(400).json({ error: "Email này đã được sử dụng. Vui lòng chọn email khác." });
    }
    const existingUserId = await service.getByUserId(trimmedUserId);
    if (existingUserId) {
      return res.status(400).json({ error: "Mã nhân viên này đã được đăng ký." });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const pdpStaffData = {
      userId: trimmedUserId,
      fullName: fullName.trim(),
      email: email.trim(),
      password: hashedPassword,
      permission: "PDP_Officer",
      status: true,
      isVerified: true
    };

    const item = await service.createOne(pdpStaffData);

    res.status(201).json({
      message: "Tạo tài khoản PDP Staff thành công!",
      data: { _id: item._id, email: item.email, userId: item.userId },
    });
  } catch (error) {
    res.status(400).json({ error: formatUserError(error) });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Vui lòng nhập mật khẩu cũ và mật khẩu mới." });
    }
    if (newPassword.length < 6 || newPassword.length > 50) {
      return res.status(400).json({ error: "Mật khẩu mới phải từ 6 đến 50 ký tự." });
    }

    const user = await service.getByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng." });
    }

    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Mật khẩu cũ không chính xác." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await service.updateById(user._id, { password: hashedPassword });

    res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { create, getAll, getById, update, remove, login, googleLogin, completeGoogleProfile, forgotPassword, resetPassword, verifyAccount, resendVerification, createPdpStaff, changePassword };
