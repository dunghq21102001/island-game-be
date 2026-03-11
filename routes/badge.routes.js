const express = require("express");
const router = express.Router();
const badgeController = require("../controllers/badge.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

/** GET /api/badges/:userId — xem tất cả huy hiệu của user (cần đăng nhập) */
router.get("/:userId", authMiddleware, badgeController.getBadgesByUserId);

module.exports = router;
