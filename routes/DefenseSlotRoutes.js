const express = require("express");
const router = express.Router();
const controller = require("../controller/DefenseSlotController");
const { authenticate } = require("../middleware/auth");

// Yêu cầu đăng nhập trước khi thao tác các slots
router.use(authenticate);

router.get("/", controller.getSlots);
router.post("/toggle-lock", controller.toggleLock);
router.post("/cancel-booking", controller.cancelSlotBooking);
router.post("/reschedule", controller.rescheduleSlotBooking);

module.exports = router;
