const express = require("express");
const router = express.Router();
const controller = require("../controller/ExpenseController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/", controller.create);
router.get("/mine", controller.getMine);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
