const express = require("express");
const router = express.Router();
const controller = require("../controller/PeriodicClubReportController");

router.post("/", controller.create);
router.get("/context/:clubId", controller.getContext);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.get("/:id/history", controller.getHistory);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
