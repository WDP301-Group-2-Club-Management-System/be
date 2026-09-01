const express = require("express");
const router = express.Router();
const controller = require("../controller/ActivityController");
const { authenticate } = require("../middleware/auth");
const { uploadActivityPlan } = require("../utils/upload");

router.use(authenticate);

router.get("/mine", controller.getMine);
router.post("/register", uploadActivityPlan.single("planDocument"), controller.register);

module.exports = router;
