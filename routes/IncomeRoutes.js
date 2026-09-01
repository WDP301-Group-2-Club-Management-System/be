const express = require("express");
const router = express.Router();
const controller = require("../controller/IncomeController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/", controller.create);
// Member's own fee invoices (UC50 "My Bills") — must precede /:id.
router.get("/my-contributions", controller.getMyContributions);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.get("/:id/contributions", controller.getContributions);
router.post("/:id/remind-all", controller.remindAll);
router.post("/:id/contributions/:contributionId/mark-received", controller.markReceived);
router.post("/:id/contributions/:contributionId/refund", controller.refund);
router.post("/:id/complete", controller.complete);
router.post("/:id/extend-deadline", controller.extendDeadline);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
