const express = require("express");
const router = express.Router();
const controller = require("../controller/EventController");
const { uploadEventCloudinary } = require("../utils/cloudinary");

router.post("/", uploadEventCloudinary.single("eventImg"), controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.put("/:id", uploadEventCloudinary.single("eventImg"), controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
