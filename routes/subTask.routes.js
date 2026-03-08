const express = require("express");
const router = express.Router();
const subTaskController = require("../controllers/subTask.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const { requireRole } = require("../middleware/role.middleware.js");

// ---------- Mentor ----------
router.post(
  "/",
  authMiddleware,
  requireRole("mentor", "admin"),
  subTaskController.createSubTask
);
router.get(
  "/mentor",
  authMiddleware,
  requireRole("mentor", "admin"),
  subTaskController.getSubTasksByMentor
);
router.get(
  "/mentor/submissions/list",
  authMiddleware,
  requireRole("mentor", "admin"),
  subTaskController.getSubTaskSubmissionsByMentor
);
router.get(
  "/mentor/:id",
  authMiddleware,
  requireRole("mentor", "admin"),
  subTaskController.getSubTaskById
);
router.put(
  "/mentor/:id",
  authMiddleware,
  requireRole("mentor", "admin"),
  subTaskController.updateSubTask
);
router.delete(
  "/mentor/:id",
  authMiddleware,
  requireRole("mentor", "admin"),
  subTaskController.deleteSubTask
);
router.put(
  "/mentor/submissions/:id/grade",
  authMiddleware,
  requireRole("mentor", "admin"),
  subTaskController.gradeSubTaskSubmission
);

// ---------- User (thành viên) ----------
router.get(
  "/me",
  authMiddleware,
  subTaskController.getMySubTasks
);
router.get(
  "/me/:id",
  authMiddleware,
  subTaskController.getMySubTaskById
);
router.post(
  "/:id/submit",
  authMiddleware,
  subTaskController.submitSubTask
);

module.exports = router;
