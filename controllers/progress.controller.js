const mongoose = require("mongoose");
const Mission = require("../models/mission.js");
const Submission = require("../models/submission.js");
const SubTask = require("../models/subTask.js");
const SubTaskSubmission = require("../models/subTaskSubmission.js");

/**
 * Tiến trình tổng: dùng cho header progress bar (đã làm bao nhiêu / tổng bao nhiêu bài).
 * Tổng = số nhiệm vụ chính (isMain) + số nhiệm vụ phụ được giao cho user.
 * Đã hoàn thành = số bài nhiệm vụ chính đã được chấm + số bài nhiệm vụ phụ đã được chấm.
 * GET /api/progress — bắt buộc đăng nhập.
 */
exports.getOverallProgress = async (req, res) => {
  try {
    const userId = req.userId ? new mongoose.Types.ObjectId(req.userId) : null;
    if (!userId) {
      return res.status(401).json({ error: "Vui lòng đăng nhập" });
    }

    let mainMissions = await Mission.find({ isMain: true, isActive: true }).select("_id").lean();
    let mainMissionIds = mainMissions.map((m) => m._id);
    let totalMain = mainMissionIds.length;

    // Fallback: nếu không có mission nào isMain, dùng tất cả mission active để tính progress
    if (totalMain === 0) {
      mainMissions = await Mission.find({ isActive: true }).select("_id").lean();
      mainMissionIds = mainMissions.map((m) => m._id);
      totalMain = mainMissionIds.length;
    }

    const mySubTasks = await SubTask.find({ assignedToUserId: userId, isActive: true }).select("_id").lean();
    const totalSubTasks = mySubTasks.length;

    const total = totalMain + totalSubTasks;

    const gradedMainCount = await Submission.countDocuments({
      userId,
      missionId: { $in: mainMissionIds },
      status: "graded",
    });

    const mySubTaskIds = mySubTasks.map((t) => t._id);
    const gradedSubTaskCount = await SubTaskSubmission.countDocuments({
      userId,
      subTaskId: { $in: mySubTaskIds },
      status: "graded",
    });

    const completed = gradedMainCount + gradedSubTaskCount;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      completed,
      total,
      percentage,
      mainCompleted: gradedMainCount,
      mainTotal: totalMain,
      subTaskCompleted: gradedSubTaskCount,
      subTaskTotal: totalSubTasks,
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};
