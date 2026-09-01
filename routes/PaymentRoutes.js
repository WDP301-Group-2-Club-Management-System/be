const express = require("express");
const router = express.Router();
const controller = require("../controller/PaymentController");
const { authenticate } = require("../middleware/auth");

// Initiating a payment requires a logged-in member (ownership checked in
// the controller); the return URL and webhook are called by the browser
// redirect / PayOS servers respectively, so they must stay public.
router.post("/payos/create", authenticate, controller.createPayment);
router.get("/payos/return", controller.payosReturn);
router.post("/payos/webhook", controller.payosWebhook);

module.exports = router;
