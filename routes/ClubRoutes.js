const express = require("express");
const router = express.Router();
const controller = require("../controller/ClubController");
const { authenticate } = require("../middleware/auth");
const { uploadClubLogo } = require("../utils/upload");
const { uploadCloudinary } = require("../utils/cloudinary");

router.post("/", authenticate, uploadCloudinary.fields([{ name: 'clubImg', maxCount: 1 }, { name: 'coverImg', maxCount: 1 }]), controller.create);
router.get("/", controller.getAll);
// New endpoints for Club Registration/Approval
router.get("/user/my-requests", authenticate, controller.getMyClubRequests);
router.post("/:id/review", authenticate, controller.reviewClubRequest);
router.get("/:id/history", controller.getClubHistory);

// New PDP-overview endpoint
router.get("/pdp-summary", authenticate, controller.getPdpSummary);

router.get("/:id", controller.getById);
router.put("/:id", authenticate, controller.update);
router.put("/:id/submit-edit", authenticate, uploadCloudinary.fields([{ name: 'clubImg', maxCount: 1 }, { name: 'coverImg', maxCount: 1 }]), controller.submitEditRequest);
router.post("/:id/logo", authenticate, uploadClubLogo.single("logo"), controller.uploadLogo);
router.delete("/:id/request", authenticate, controller.deleteClubRequest);
router.delete("/:id", controller.remove);

module.exports = router;

