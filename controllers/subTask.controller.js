const SubTask = require("../models/subTask.js");
const SubTaskSubmission = require("../models/subTaskSubmission.js");
const Submission = require("../models/submission.js");
const Mission = require("../models/mission.js");
const User = require("../models/user.js");
const badgeService = require("../services/badge.service.js");

/**
 * Mentor tạo nhiệm vụ phụ cho một thành viên.
 * Thành viên phải đã hoàn thành (được chấm) nhiệm vụ chính mainMissionId.
 * Body: { assignedToUserId, mainMissionId, name, description?, steps, points? }
 */
exports.createSubTask = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { assignedToUserId, mainMissionId, name, description, steps, points } = req.body;

    if (!assignedToUserId || !mainMissionId || !name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        error: "Thiếu assignedToUserId, mainMissionId, name hoặc steps (mảng có ít nhất 1 phần tử).",
      });
    }

    const user = await User.findOne({ _id: assignedToUserId, mentorId, role: "user" });
    if (!user) {
      return res.status(403).json({ error: "Chỉ được tạo nhiệm vụ phụ cho thành viên do mình quản lý." });
    }

    const mainMission = await Mission.findById(mainMissionId);
    if (!mainMission) {
      return res.status(404).json({ error: "Nhiệm vụ chính không tồn tại." });
    }

    const gradedSubmission = await Submission.findOne({
      userId: assignedToUserId,
      missionId: mainMissionId,
      status: "graded",
    });
    if (!gradedSubmission) {
      return res.status(400).json({
        error: "Thành viên chưa hoàn thành (được chấm) nhiệm vụ chính. Chỉ có thể giao nhiệm vụ phụ sau khi nhiệm vụ chính đã được chấm.",
      });
    }

    const subTask = new SubTask({
      mentorId,
      assignedToUserId,
      mainMissionId,
      name,
      description: description || "",
      steps: steps.map((s, i) => ({
        order: s.order != null ? s.order : i + 1,
        type: s.type,
        title: s.title,
        config: s.config || {},
      })),
      points: points != null ? Math.max(0, Number(points)) : 0,
      isActive: true,
    });
    await subTask.save();

    const populated = await SubTask.findById(subTask._id)
      .populate("assignedToUserId", "username avatar")
      .populate("mainMissionId", "name");
    res.status(201).json(populated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor xem danh sách nhiệm vụ phụ do mình tạo. Query: ?assignedToUserId=...
 */
exports.getSubTasksByMentor = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { assignedToUserId } = req.query;

    const filter = { mentorId };
    if (assignedToUserId) filter.assignedToUserId = assignedToUserId;

    const subTasks = await SubTask.find(filter)
      .populate("assignedToUserId", "username avatar")
      .populate("mainMissionId", "name mapId")
      .sort({ createdAt: -1 })
      .lean();

    res.json(subTasks);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor xem chi tiết một nhiệm vụ phụ (và có thể cập nhật/xóa sau).
 */
exports.getSubTaskById = async (req, res) => {
  try {
    const mentorId = req.userId;
    const subTask = await SubTask.findById(req.params.id)
      .populate("assignedToUserId", "username avatar")
      .populate("mainMissionId", "name mapId")
      .lean();

    if (!subTask) {
      return res.status(404).json({ error: "Nhiệm vụ phụ không tồn tại." });
    }
    if (subTask.mentorId.toString() !== mentorId.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xem nhiệm vụ phụ này." });
    }

    res.json(subTask);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor cập nhật nhiệm vụ phụ (chỉ khi chưa có ai nộp bài).
 */
exports.updateSubTask = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { name, description, steps, points, isActive } = req.body;

    const subTask = await SubTask.findById(req.params.id);
    if (!subTask) {
      return res.status(404).json({ error: "Nhiệm vụ phụ không tồn tại." });
    }
    if (subTask.mentorId.toString() !== mentorId.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền sửa nhiệm vụ phụ này." });
    }

    const hasSubmission = await SubTaskSubmission.exists({ subTaskId: subTask._id });
    if (hasSubmission) {
      return res.status(400).json({ error: "Đã có thành viên nộp bài, không thể sửa nội dung nhiệm vụ phụ." });
    }

    if (name !== undefined) subTask.name = name;
    if (description !== undefined) subTask.description = description;
    if (points !== undefined) subTask.points = Math.max(0, Number(points));
    if (isActive !== undefined) subTask.isActive = isActive;
    if (Array.isArray(steps) && steps.length > 0) {
      subTask.steps = steps.map((s, i) => ({
        order: s.order != null ? s.order : i + 1,
        type: s.type,
        title: s.title,
        config: s.config || {},
      }));
    }
    await subTask.save();

    const updated = await SubTask.findById(subTask._id)
      .populate("assignedToUserId", "username avatar")
      .populate("mainMissionId", "name mapId");
    res.json(updated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor xóa nhiệm vụ phụ (chỉ khi chưa có ai nộp bài).
 */
exports.deleteSubTask = async (req, res) => {
  try {
    const mentorId = req.userId;
    const subTask = await SubTask.findById(req.params.id);
    if (!subTask) {
      return res.status(404).json({ error: "Nhiệm vụ phụ không tồn tại." });
    }
    if (subTask.mentorId.toString() !== mentorId.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xóa nhiệm vụ phụ này." });
    }

    const hasSubmission = await SubTaskSubmission.exists({ subTaskId: subTask._id });
    if (hasSubmission) {
      return res.status(400).json({ error: "Đã có thành viên nộp bài, không thể xóa nhiệm vụ phụ." });
    }

    await SubTask.findByIdAndDelete(subTask._id);
    res.json({ message: "Xóa nhiệm vụ phụ thành công." });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * User: danh sách nhiệm vụ phụ được giao cho mình.
 * Chỉ trả về những nhiệm vụ phụ mà nhiệm vụ chính (mainMissionId) đã được user hoàn thành (submission graded).
 */
exports.getMySubTasks = async (req, res) => {
  try {
    const userId = req.userId;

    const mySubTasks = await SubTask.find({ assignedToUserId: userId, isActive: true })
      .populate("mainMissionId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const mainMissionIds = [...new Set(mySubTasks.map((t) => t.mainMissionId?._id?.toString()).filter(Boolean))];
    const gradedMain = await Submission.find({
      userId,
      missionId: { $in: mainMissionIds },
      status: "graded",
    })
      .select("missionId")
      .lean();
    const completedMainIds = new Set(gradedMain.map((s) => s.missionId.toString()));

    const visible = mySubTasks.filter((t) => {
      const mainId = t.mainMissionId?._id?.toString();
      return mainId && completedMainIds.has(mainId);
    });

    const subTaskIds = visible.map((t) => t._id);
    const submissions = await SubTaskSubmission.find({ userId, subTaskId: { $in: subTaskIds } }).lean();
    const submissionBySubTask = {};
    submissions.forEach((s) => {
      submissionBySubTask[s.subTaskId.toString()] = s;
    });

    const result = visible.map((t) => ({
      ...t,
      submission: submissionBySubTask[t._id.toString()] || null,
      submitted: !!submissionBySubTask[t._id.toString()],
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * User: xem chi tiết một nhiệm vụ phụ (chỉ khi đã hoàn thành nhiệm vụ chính và được giao nhiệm vụ phụ này).
 */
exports.getMySubTaskById = async (req, res) => {
  try {
    const userId = req.userId;
    const subTaskId = req.params.id;

    const subTask = await SubTask.findOne({ _id: subTaskId, assignedToUserId: userId, isActive: true })
      .populate("mainMissionId", "name")
      .lean();

    if (!subTask) {
      return res.status(404).json({ error: "Nhiệm vụ phụ không tồn tại hoặc không được giao cho bạn." });
    }

    const graded = await Submission.findOne({
      userId,
      missionId: subTask.mainMissionId._id,
      status: "graded",
    });
    if (!graded) {
      return res.status(403).json({ error: "Bạn cần hoàn thành nhiệm vụ chính trước khi xem nhiệm vụ phụ này." });
    }

    const submission = await SubTaskSubmission.findOne({ userId, subTaskId }).lean();

    res.json({
      ...subTask,
      submission: submission || null,
      submitted: !!submission,
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * User: nộp bài nhiệm vụ phụ. Body: { answers: [...], timeSpentSeconds? }
 */
exports.submitSubTask = async (req, res) => {
  try {
    const userId = req.userId;
    const subTaskId = req.params.id;
    const { answers, timeSpentSeconds } = req.body;

    const subTask = await SubTask.findOne({ _id: subTaskId, assignedToUserId: userId, isActive: true });
    if (!subTask) {
      return res.status(404).json({ error: "Nhiệm vụ phụ không tồn tại hoặc không được giao cho bạn." });
    }

    const gradedMain = await Submission.findOne({
      userId,
      missionId: subTask.mainMissionId,
      status: "graded",
    });
    if (!gradedMain) {
      return res.status(403).json({ error: "Bạn cần hoàn thành nhiệm vụ chính trước khi nộp nhiệm vụ phụ." });
    }

    const existing = await SubTaskSubmission.findOne({ userId, subTaskId });
    if (existing) {
      return res.status(400).json({ error: "Bạn đã nộp bài nhiệm vụ phụ này rồi." });
    }

    const payload = {
      userId,
      subTaskId,
      answers: Array.isArray(answers) ? answers : [],
      status: "submitted",
    };
    if (typeof timeSpentSeconds === "number" && timeSpentSeconds >= 0) {
      payload.timeSpentSeconds = Math.floor(timeSpentSeconds);
    }
    const submission = new SubTaskSubmission(payload);
    await submission.save();

    const populated = await SubTaskSubmission.findById(submission._id)
      .populate("subTaskId", "name description steps points")
      .populate("userId", "username avatar");
    res.status(201).json(populated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor: danh sách bài làm nhiệm vụ phụ của các thành viên do mình quản lý.
 */
exports.getSubTaskSubmissionsByMentor = async (req, res) => {
  try {
    const mentorId = req.userId;

    const userIds = await User.find({ mentorId, role: "user" }).select("_id").lean();
    const ids = userIds.map((u) => u._id);

    const submissions = await SubTaskSubmission.find({ userId: { $in: ids } })
      .populate("userId", "username avatar points")
      .populate("subTaskId", "name description steps points assignedToUserId mainMissionId")
      .populate("gradedBy", "username")
      .sort({ submittedAt: -1 })
      .lean();

    const subTasksByMentor = await SubTask.find({ mentorId }).select("_id").lean();
    const subTaskIds = new Set(subTasksByMentor.map((t) => t._id.toString()));
    const filtered = submissions.filter((s) => s.subTaskId && subTaskIds.has(s.subTaskId._id.toString()));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor: chấm điểm bài làm nhiệm vụ phụ. Body: { score: number, feedback?: string }
 * Cộng điểm vào user.points và user.tasksCompleted +1.
 */
exports.gradeSubTaskSubmission = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { id } = req.params;
    const { score: inputScore, feedback } = req.body;

    const submission = await SubTaskSubmission.findById(id)
      .populate("userId", "mentorId points tasksCompleted")
      .populate("subTaskId", "name points");
    if (!submission) {
      return res.status(404).json({ error: "Bài làm nhiệm vụ phụ không tồn tại." });
    }
    if (submission.userId.mentorId?.toString() !== mentorId.toString()) {
      return res.status(403).json({ error: "Bạn chỉ được chấm bài của thành viên do mình quản lý." });
    }
    if (submission.status === "graded") {
      const updated = await SubTaskSubmission.findById(submission._id)
        .populate("userId", "username avatar points tasksCompleted")
        .populate("subTaskId", "name description steps points")
        .populate("gradedBy", "username");
      return res.json(updated);
    }

    if (inputScore === undefined || inputScore === null || inputScore === "") {
      return res.status(400).json({ error: "Vui lòng nhập điểm để chấm bài." });
    }
    const score = Math.max(0, Number(inputScore));
    if (Number.isNaN(score)) {
      return res.status(400).json({ error: "Điểm phải là số hợp lệ (>= 0)." });
    }

    submission.status = "graded";
    submission.score = score;
    submission.feedback = feedback != null && feedback !== "" ? String(feedback).trim() : null;
    submission.gradedAt = new Date();
    submission.gradedBy = mentorId;
    await submission.save();

    const user = await User.findById(submission.userId._id);
    user.points = (user.points || 0) + score;
    user.tasksCompleted = (user.tasksCompleted || 0) + 1;
    await user.save();

    await badgeService.checkAndGrantStreakBadges(submission.userId._id);

    const updated = await SubTaskSubmission.findById(submission._id)
      .populate("userId", "username avatar points tasksCompleted")
      .populate("subTaskId", "name description steps points")
      .populate("gradedBy", "username");
    res.json(updated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};
