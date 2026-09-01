const express = require("express");
const router = express.Router();
const controller = require("../controller/TransactionController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// UC49 BR-01 — transaction logs are strictly immutable: only GET routes
// exist, there is deliberately no POST/PUT/DELETE at all. Ledger rows are
// created/flipped exclusively by internal flows (expense approval, cash
// confirmation, payment gateway callback).
router.get("/dashboard", controller.getDashboard);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

module.exports = router;
