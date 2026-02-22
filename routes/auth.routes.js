const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const { requireRole } = require("../middleware/role.middleware.js");

router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.getMe);
router.put("/change-password", authMiddleware, authController.changePassword);
router.put(
  "/profile",
  authMiddleware,
  requireRole("user"),
  authController.updateProfile
);

module.exports = router;
