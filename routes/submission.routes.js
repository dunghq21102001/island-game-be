const express = require("express");
const router = express.Router();
const submissionController = require("../controllers/submission.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const { requireRole } = require("../middleware/role.middleware.js");

// User: submit bài làm
router.post(
  "/",
  authMiddleware,
  submissionController.submitMission
);

// User: kiểm tra đã làm bài (mission) đó chưa
router.get(
  "/check/:missionId",
  authMiddleware,
  submissionController.checkSubmission
);

// User: xem lịch sử bài làm và điểm
router.get(
  "/me",
  authMiddleware,
  submissionController.getMySubmissions
);

// User: xem lại các mission đã làm trên map (cho bước 3 mission "đối chiếu")
router.get(
  "/me/map/:mapId",
  authMiddleware,
  submissionController.getMySubmissionsByMapId
);

// Mentor: xem danh sách bài làm của user do mình quản lý
router.get(
  "/mentor",
  authMiddleware,
  requireRole("mentor", "admin"),
  submissionController.getSubmissionsByMentor
);

// Mentor: xác nhận bài làm (cộng mission.points vào user.points, không nhập điểm)
router.put(
  "/:id/grade",
  authMiddleware,
  requireRole("mentor", "admin"),
  submissionController.gradeSubmission
);

module.exports = router;
