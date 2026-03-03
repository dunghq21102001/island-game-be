const express = require("express");
const router = express.Router();
const missionController = require("../controllers/mission.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const optionalAuthMiddleware = authMiddleware.optionalAuthMiddleware;
const { requireRole } = require("../middleware/role.middleware.js");

// Public (optional auth: nếu user đăng nhập gọi GET /map/:mapId thì trả thêm completedByUser)
router.get("/", missionController.getAllMissions);
router.get("/map/:mapId", optionalAuthMiddleware, missionController.getMissionsByMapId);
router.get("/:id", missionController.getMissionById);

// Upload ảnh (user đăng nhập có thể upload khi hoàn thành step)
router.post("/upload-image", authMiddleware, missionController.uploadImage);

// Chỉ mentor/admin được tạo/sửa/xóa nhiệm vụ
router.post(
  "/",
  authMiddleware,
  requireRole("mentor", "admin"),
  missionController.createMission
);
router.put(
  "/:id",
  authMiddleware,
  requireRole("mentor", "admin"),
  missionController.updateMission
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole("mentor", "admin"),
  missionController.deleteMission
);

module.exports = router;
