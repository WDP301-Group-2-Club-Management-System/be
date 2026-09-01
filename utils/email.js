const nodemailer = require("nodemailer");

const isConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
const getTransporter = () => {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

// SMTP not configured yet (no credentials provided) → fall back to logging
// instead of throwing, so register/forgot-password still work end-to-end
// during local development without blocking on real email delivery.
const sendMail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL not sent - SMTP not configured] To: ${to} | Subject: ${subject}`);
    return { sent: false };
  }
  await t.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
  return { sent: true };
};

const sendVerificationEmail = (to, otp) =>
  sendMail({
    to,
    subject: "Xác thực tài khoản UniPortal",
    html: `<p>Chào bạn,</p><p>Mã xác thực tài khoản UniPortal của bạn là:</p><h2 style="letter-spacing:4px">${otp}</h2><p>Mã có hiệu lực trong 15 phút. Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email.</p>`,
  });

const sendResetPasswordEmail = (to, otp) =>
  sendMail({
    to,
    subject: "Đặt lại mật khẩu UniPortal",
    html: `<p>Chào bạn,</p><p>Mã xác nhận đặt lại mật khẩu của bạn là:</p><h2 style="letter-spacing:4px">${otp}</h2><p>Mã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>`,
  });

module.exports = { sendMail, sendVerificationEmail, sendResetPasswordEmail, isConfigured };
