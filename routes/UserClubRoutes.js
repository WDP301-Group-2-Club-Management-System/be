const express = require("express");
const router = express.Router();
const controller = require("../controller/UserClubController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/", controller.create);
router.get("/", controller.getAll);
router.put("/swap-chairman", controller.swapChairman);
router.put("/swap-dept-lead", controller.swapDeptLead);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
