const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

router.post("/", userController.createUser);
router.get("/leaderboard", authMiddleware, userController.getLeaderboard);
router.get("/mentor/:mentorId", authMiddleware, userController.getUsersByMentorId);
router.get("/", authMiddleware, userController.getAllUsers);
router.put("/:id", authMiddleware, userController.updateUser);
router.delete("/:id", authMiddleware, userController.deleteUser);

module.exports = router;
