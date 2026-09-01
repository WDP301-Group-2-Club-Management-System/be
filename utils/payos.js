const { PayOS } = require("@payos/node");

// Lazy singleton — the server must boot fine without PayOS credentials
// (payment endpoints then respond 503 instead of crashing at require-time),
// same graceful-degradation pattern as utils/email.js with SMTP.
let client = null;

const isConfigured = () =>
  !!(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);

const getClient = () => {
  if (!isConfigured()) return null;
  if (!client) {
    client = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return client;
};

// PayOS orderCode must be a unique positive number — millisecond timestamp
// plus 3 random digits keeps it unique and sortable.
const generateOrderCode = () =>
  Date.now() * 1000 + Math.floor(Math.random() * 1000);

// QR code/payment link is valid for 5 minutes unless the caller overrides.
const PAYMENT_LINK_TTL_SECONDS = 5 * 60;

const createPaymentLink = async ({ orderCode, amount, description, returnUrl, cancelUrl, expiredAt }) => {
  const payos = getClient();
  if (!payos) throw new Error("PayOS chưa được cấu hình trên máy chủ.");
  return payos.paymentRequests.create({
    orderCode,
    amount,
    // VietQR transfer-note limit — PayOS rejects descriptions over 25 chars.
    description: String(description).slice(0, 25),
    returnUrl,
    cancelUrl,
    expiredAt: expiredAt ?? Math.floor(Date.now() / 1000) + PAYMENT_LINK_TTL_SECONDS,
  });
};

// Server-side source of truth for a payment's real status — the return-URL
// query params are unsigned and must never be trusted on their own.
const getPaymentInfo = async (orderCode) => {
  const payos = getClient();
  if (!payos) throw new Error("PayOS chưa được cấu hình trên máy chủ.");
  return payos.paymentRequests.get(Number(orderCode));
};

// Signature-verified webhook payload (throws on invalid signature).
const verifyWebhook = async (body) => {
  const payos = getClient();
  if (!payos) throw new Error("PayOS chưa được cấu hình trên máy chủ.");
  return payos.webhooks.verify(body);
};

// Best-effort cancel — used when re-initiating a payment so the previous
// link can never be paid after its orderCode stops being tracked.
const cancelPaymentLink = async (orderCode, reason) => {
  const payos = getClient();
  if (!payos) return;
  try {
    await payos.paymentRequests.cancel(Number(orderCode), reason);
  } catch (e) {
    // Already cancelled/expired/never created — nothing left to pay, fine.
    console.warn("cancelPaymentLink (bỏ qua):", e.message);
  }
};

module.exports = {
  isConfigured,
  generateOrderCode,
  createPaymentLink,
  getPaymentInfo,
  verifyWebhook,
  cancelPaymentLink,
};
