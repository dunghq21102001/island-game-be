const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progress.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

router.get("/", authMiddleware, progressController.getOverallProgress);

module.exports = router;
