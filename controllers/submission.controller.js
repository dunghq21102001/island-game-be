const Submission = require("../models/submission.js");
const Mission = require("../models/mission.js");
const User = require("../models/user.js");

/**
 * User submit bài làm (sau khi hoàn thành mission).
 * Body: { missionId, answers: [...] }
 */
exports.submitMission = async (req, res) => {
  try {
    const userId = req.userId;
    const { missionId, answers } = req.body;

    if (!missionId) {
      return res.status(400).json({ error: "Thiếu missionId" });
    }

    const mission = await Mission.findById(missionId);
    if (!mission) {
      return res.status(404).json({ error: "Nhiệm vụ không tồn tại" });
    }

    const submission = new Submission({
      userId,
      missionId,
      answers: Array.isArray(answers) ? answers : [],
      status: "submitted",
    });
    await submission.save();

    const populated = await Submission.findById(submission._id)
      .populate("missionId", "name description steps")
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
 * User xem lịch sử bài làm của mình và điểm đã được chấm.
 */
exports.getMySubmissions = async (req, res) => {
  try {
    const userId = req.userId;

    const submissions = await Submission.find({ userId })
      .populate("missionId", "name description steps order mapId")
      .sort({ submittedAt: -1 })
      .lean();

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor xem danh sách bài làm của các user do mình quản lý (user.mentorId === mentorId).
 */
exports.getSubmissionsByMentor = async (req, res) => {
  try {
    const mentorId = req.userId;

    const usersOfMentor = await User.find({ mentorId, role: "user" })
      .select("_id")
      .lean();
    const userIds = usersOfMentor.map((u) => u._id);

    const submissions = await Submission.find({ userId: { $in: userIds } })
      .populate("userId", "username avatar points")
      .populate("missionId", "name description steps order mapId")
      .populate("gradedBy", "username")
      .sort({ submittedAt: -1 })
      .lean();

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor chấm điểm bài làm. Điểm được cộng vào user.points và tasksCompleted +1.
 * Body: { score: number }
 */
exports.gradeSubmission = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { id } = req.params;
    const rawScore = req.body.score;
    const score = typeof rawScore === "string" ? parseFloat(rawScore) : Number(rawScore);

    if (rawScore === undefined || rawScore === null || Number.isNaN(score)) {
      return res.status(400).json({ error: "Thiếu hoặc sai định dạng điểm (score phải là số)" });
    }
    if (score < 0) {
      return res.status(400).json({ error: "Điểm không được âm" });
    }

    const submission = await Submission.findById(id)
      .populate("userId", "mentorId points tasksCompleted");
    if (!submission) {
      return res.status(404).json({ error: "Bài làm không tồn tại" });
    }
    if (submission.userId.mentorId?.toString() !== mentorId.toString()) {
      return res.status(403).json({ error: "Bạn chỉ được chấm bài của user do mình quản lý" });
    }
    if (submission.status === "graded") {
      const oldScore = submission.score;
      const user = await User.findById(submission.userId._id);
      user.points = (user.points || 0) - oldScore + score;
      await user.save();
      submission.score = score;
      submission.gradedAt = new Date();
      submission.gradedBy = mentorId;
      await submission.save();
      const updated = await Submission.findById(submission._id)
        .populate("userId", "username avatar points tasksCompleted")
        .populate("missionId", "name description steps")
        .populate("gradedBy", "username");
      return res.json(updated);
    }

    submission.status = "graded";
    submission.score = score;
    submission.gradedAt = new Date();
    submission.gradedBy = mentorId;
    await submission.save();

    const user = await User.findById(submission.userId._id);
    user.points = (user.points || 0) + score;
    user.tasksCompleted = (user.tasksCompleted || 0) + 1;
    await user.save();

    const updated = await Submission.findById(submission._id)
      .populate("userId", "username avatar points tasksCompleted")
      .populate("missionId", "name description steps")
      .populate("gradedBy", "username");
    res.json(updated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};
