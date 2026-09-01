const express = require("express");
const router = express.Router();
const controller = require("../controller/UserController");
const { authenticate } = require("../middleware/auth");

router.post("/pdp-staff", authenticate, (req, res, next) => {
  if (req.user.permission !== "Admin") {
    return res.status(403).json({ error: "Bạn không có quyền thực hiện chức năng này." });
  }
  next();
}, controller.createPdpStaff);

router.post("/", controller.create);
router.post("/login", controller.login);
router.post("/google-login", controller.googleLogin);
router.post("/complete-google-profile", controller.completeGoogleProfile);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.post("/verify", controller.verifyAccount);
router.post("/resend-verification", controller.resendVerification);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.put("/change-password", authenticate, controller.changePassword);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
