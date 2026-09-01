const express = require("express");
const controller = require("../controller/RecruitmentApplicationController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticate, controller.create);
router.get("/check/:campaignId", authenticate, controller.checkApplication);
router.get("/", authenticate, controller.getAll);
router.put("/:id/status", authenticate, controller.updateStatus);
router.post("/:id/approve", authenticate, controller.approveApplication);

module.exports = router;
