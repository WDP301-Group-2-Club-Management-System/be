const express = require("express");
const router = express.Router();
const controller = require("../controller/EventScheduleController");

router.post("/", controller.create);
router.post("/validate", controller.validateSchedules);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
