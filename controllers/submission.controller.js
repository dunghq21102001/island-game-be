const Submission = require("../models/submission.js");
const Mission = require("../models/mission.js");
const User = require("../models/user.js");
const badgeService = require("../services/badge.service.js");

/**
 * User submit bài làm (sau khi hoàn thành mission).
 * Body: { missionId, answers: [...], timeSpentSeconds?: number }
 */
exports.submitMission = async (req, res) => {
  try {
    const userId = req.userId;
    const { missionId, answers, timeSpentSeconds } = req.body;

    if (!missionId) {
      return res.status(400).json({ error: "Thiếu missionId" });
    }

    const mission = await Mission.findById(missionId);
    if (!mission) {
      return res.status(404).json({ error: "Nhiệm vụ không tồn tại" });
    }

    const payload = {
      userId,
      missionId,
      answers: Array.isArray(answers) ? answers : [],
      status: "submitted",
    };
    if (typeof timeSpentSeconds === "number" && timeSpentSeconds >= 0) {
      payload.timeSpentSeconds = Math.floor(timeSpentSeconds);
    }
    const submission = new Submission(payload);
    await submission.save();

    const populated = await Submission.findById(submission._id)
      .populate("missionId", "name description steps points")
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
 * User kiểm tra đã làm bài (mission) đó chưa.
 * GET /submission/check/:missionId
 */
exports.checkSubmission = async (req, res) => {
  try {
    const userId = req.userId;
    const { missionId } = req.params;

    if (!missionId) {
      return res.status(400).json({ error: "Thiếu missionId" });
    }

    const submission = await Submission.findOne({ userId, missionId })
      .populate("missionId", "name description steps order mapId points")
      .lean();

    res.json({
      submitted: !!submission,
      submission: submission || null,
    });
  } catch (error) {
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
      .populate("missionId", "name description steps order mapId points")
      .sort({ submittedAt: -1 })
      .lean();

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * User xem lại các mission đã làm trên một map (dùng ở bước 3 mission "đối chiếu").
 * GET /submission/me/map/:mapId
 * Trả về: danh sách mission thuộc map + với mỗi mission đã có submission thì kèm thông tin bài làm.
 */
exports.getMySubmissionsByMapId = async (req, res) => {
  try {
    const userId = req.userId;
    const mapId = Number(req.params.mapId);
    if (Number.isNaN(mapId)) {
      return res.status(400).json({ error: "mapId không hợp lệ" });
    }

    const missions = await Mission.find({ mapId, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const missionIds = missions.map((m) => m._id);
    const submissions = await Submission.find({
      userId,
      missionId: { $in: missionIds },
    })
      .populate("missionId", "name description steps order mapId points")
      .lean();

    const submissionByMission = {};
    submissions.forEach((s) => {
      const mid = (s.missionId && s.missionId._id) ? s.missionId._id.toString() : s.missionId?.toString();
      if (mid) submissionByMission[mid] = s;
    });

    const result = missions.map((mission) => {
      const mid = mission._id.toString();
      const submission = submissionByMission[mid] || null;
      const steps = mission.steps || [];
      const answers = submission && Array.isArray(submission.answers) ? submission.answers : [];
      const answersByStep = {};
      answers.forEach((a) => {
        const idx = a.stepIndex != null ? Number(a.stepIndex) : -1;
        if (idx >= 0) answersByStep[idx] = a.value;
      });
      const stepsDetail = steps.map((step, stepIndex) => ({
        stepIndex,
        stepTitle: step.title || `Bước ${stepIndex + 1}`,
        value: answersByStep[stepIndex] !== undefined ? answersByStep[stepIndex] : null,
      }));

      return {
        mapId,
        mission: {
          _id: mission._id,
          name: mission.name,
          description: mission.description,
          order: mission.order,
          mapId: mission.mapId,
          steps: mission.steps,
          points: mission.points,
        },
        submitted: !!submission,
        submission: submission
          ? {
              _id: submission._id,
              answers: submission.answers,
              status: submission.status,
              score: submission.score,
              submittedAt: submission.submittedAt,
              timeSpentSeconds: submission.timeSpentSeconds,
            }
          : null,
        stepsDetail,
      };
    });

    res.json(result);
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
      .populate("missionId", "name description steps order mapId points isOnlyConfirmPoint")
      .populate("gradedBy", "username")
      .sort({ submittedAt: -1 })
      .lean();

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Mentor chấm điểm bài làm. Body: { score: number, feedback?: string } — điểm bắt buộc, feedback tùy chọn.
 * Điểm được lưu vào submission và cộng vào user.points, tasksCompleted +1.
 */
exports.gradeSubmission = async (req, res) => {
  try {
    const mentorId = req.userId;
    const { id } = req.params;
    const { score: inputScore, feedback } = req.body;

    const submission = await Submission.findById(id)
      .populate("userId", "mentorId points tasksCompleted")
      .populate("missionId", "name description steps points order");
    if (!submission) {
      return res.status(404).json({ error: "Bài làm không tồn tại" });
    }
    if (submission.userId.mentorId?.toString() !== mentorId.toString()) {
      return res.status(403).json({ error: "Bạn chỉ được chấm bài của user do mình quản lý" });
    }
    if (!submission.missionId.isOnlyConfirmPoint && submission.missionId.points < inputScore) {
      return res.status(400).json({ error: `Điểm tối đa cho bài làm này là ${submission.missionId.points}` });
    }
    if (submission.status === "graded") {
      const updated = await Submission.findById(submission._id)
        .populate("userId", "username avatar points tasksCompleted")
        .populate("missionId", "name description steps points")
        .populate("gradedBy", "username");
      return res.json(updated);
    }

    if (inputScore === undefined || inputScore === null || inputScore === "") {
      return res.status(400).json({ error: "Vui lòng nhập điểm để chấm bài" });
    }
    const score = Math.max(0, Number(inputScore));
    if (Number.isNaN(score)) {
      return res.status(400).json({ error: "Điểm phải là số hợp lệ (>= 0)" });
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

    const missionOrder = submission.missionId?.order != null ? submission.missionId.order : (await Mission.findById(submission.missionId._id || submission.missionId).select("order").lean())?.order;
    if (missionOrder != null) {
      await badgeService.checkAndGrantMissionBadges(submission.userId._id, missionOrder);
      // Nhiệm vụ thứ 3 (order = 2 vì order 0-indexed)
      if (Number(missionOrder) === 2) {
        const missionId = submission.missionId._id || submission.missionId;
        await badgeService.checkAndGrantPhongVienXuatSac(missionId, mentorId);
      }
    }

    const updated = await Submission.findById(submission._id)
      .populate("userId", "username avatar points tasksCompleted")
      .populate("missionId", "name description steps points")
      .populate("gradedBy", "username");
    res.json(updated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};
