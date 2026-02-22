const mongoose = require("mongoose");
const Mission = require("../models/mission.js");
const { uploadImage } = require("../services/imgbb.service.js");

exports.getAllMissions = async (req, res) => {
  try {
    const { isActive, mapId } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (mapId) filter.mapId = mapId;

    const missions = await Mission.find(filter).sort({ order: 1, createdAt: 1 });
    res.json(missions);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/** Lấy danh sách nhiệm vụ theo mapId (để hiển thị lên ảnh bản đồ theo x, y) */
exports.getMissionsByMapId = async (req, res) => {
  try {
    const { mapId } = req.params;
    const missions = await Mission.find({ mapId, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    const payload = missions.map((m) => ({
      ...m,
      stepsShowMapSubmissions: getStepsShowMapSubmissions(m.steps),
      stepsShowMapConfig: getStepsShowMapConfig(m.steps),
    }));
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Trả về mảng index (0-based) các step cần hiển thị block "Các mission đã làm ở map".
 * Step có config.showMissionsDoneOnMap === true hoặc config.showMissionStep thì được đưa vào.
 */
function getStepsShowMapSubmissions(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s, index) => {
      const hasShow = (s.config && s.config.showMissionsDoneOnMap === true) ||
        (s.config && s.config.showMissionStep && s.config.showMissionStep.missionId != null && Number.isInteger(s.config.showMissionStep.stepIndex));
      return hasShow ? index : -1;
    })
    .filter((i) => i >= 0);
}

/**
 * Trả về cấu hình chi tiết: mỗi step hiển thị mission/step nào (map nào, mission nào, step nào).
 * Dùng cho API response để frontend biết rõ sẽ show mission nào + step nào.
 */
function getStepsShowMapConfig(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s, index) => {
      const config = s.config || {};
      if (config.showMissionStep && config.showMissionStep.missionId != null && Number.isInteger(config.showMissionStep.stepIndex)) {
        return { stepIndex: index, showMissionStep: { missionId: config.showMissionStep.missionId, stepIndex: config.showMissionStep.stepIndex } };
      }
      if (config.showMissionsDoneOnMap === true) {
        return { stepIndex: index, showMissionsDoneOnMap: true };
      }
      return null;
    })
    .filter(Boolean);
}

exports.getMissionById = async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id).lean();
    if (!mission) {
      return res.status(404).json({ error: "Nhiệm vụ không tồn tại" });
    }
    const payload = {
      ...mission,
      stepsShowMapSubmissions: getStepsShowMapSubmissions(mission.steps),
      stepsShowMapConfig: getStepsShowMapConfig(mission.steps),
    };
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

function normalizeShowMissionStep(showMissionStep) {
  if (!showMissionStep || showMissionStep.missionId == null) return null;
  const stepIndex = Number(showMissionStep.stepIndex);
  if (Number.isNaN(stepIndex) || stepIndex < 0) return null;
  const missionId = showMissionStep.missionId;
  return {
    missionId: mongoose.Types.ObjectId.isValid(missionId) ? (typeof missionId === "string" ? new mongoose.Types.ObjectId(missionId) : missionId) : null,
    stepIndex,
  };
}

exports.createMission = async (req, res) => {
  try {
    const { mapId, name, description, order, x, y, steps, points, isActive, stepsShowMapSubmissions } = req.body;

    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        error: "Thiếu name hoặc steps. Steps phải là mảng có ít nhất 1 phần tử.",
      });
    }

    const mapSubsStepIndices = Array.isArray(stepsShowMapSubmissions)
      ? stepsShowMapSubmissions.map((n) => Number(n)).filter((n) => !Number.isNaN(n) && n >= 0)
      : [];

    const mission = new Mission({
      mapId: mapId || null,
      name,
      description: description || "",
      order: order != null ? Number(order) : 0,
      x: x != null ? Number(x) : 0,
      y: y != null ? Number(y) : 0,
      steps: steps.map((s, i) => {
        const cfg = s.config || {};
        const showMissionStep = normalizeShowMissionStep(cfg.showMissionStep);
        return {
          order: s.order != null ? s.order : i + 1,
          type: s.type,
          title: s.title,
          config: {
            ...cfg,
            ...(showMissionStep
              ? { showMissionStep, showMissionsDoneOnMap: false }
              : { showMissionsDoneOnMap: mapSubsStepIndices.includes(i) }),
          },
        };
      }),
      points: points != null ? Math.max(0, Number(points)) : 0,
      isActive: isActive !== false,
    });

    await mission.save();
    const saved = mission.toObject ? mission.toObject() : mission;
    res.status(201).json({
      ...saved,
      stepsShowMapSubmissions: getStepsShowMapSubmissions(mission.steps),
      stepsShowMapConfig: getStepsShowMapConfig(mission.steps),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.updateMission = async (req, res) => {
  try {
    const { mapId, name, description, order, x, y, steps, points, isActive, stepsShowMapSubmissions } = req.body;
    const updateData = {};

    if (mapId !== undefined) updateData.mapId = mapId || null;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = Number(order);
    if (x !== undefined) updateData.x = Number(x);
    if (y !== undefined) updateData.y = Number(y);
    if (points !== undefined) updateData.points = Math.max(0, Number(points));
    if (isActive !== undefined) updateData.isActive = isActive;
    if (Array.isArray(steps)) {
      const mapSubsStepIndices =
        stepsShowMapSubmissions !== undefined && Array.isArray(stepsShowMapSubmissions)
          ? stepsShowMapSubmissions.map((n) => Number(n)).filter((n) => !Number.isNaN(n) && n >= 0)
          : null;
      updateData.steps = steps.map((s, i) => {
        const cfg = s.config || {};
        const showMissionStep = normalizeShowMissionStep(cfg.showMissionStep);
        return {
          order: s.order != null ? s.order : i + 1,
          type: s.type,
          title: s.title,
          config: {
            ...cfg,
            ...(showMissionStep
              ? { showMissionStep, showMissionsDoneOnMap: false }
              : mapSubsStepIndices !== null
                ? { showMissionsDoneOnMap: mapSubsStepIndices.includes(i) }
                : {}),
          },
        };
      });
    }

    const mission = await Mission.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!mission) {
      return res.status(404).json({ error: "Nhiệm vụ không tồn tại" });
    }
    res.json({
      ...mission,
      stepsShowMapSubmissions: getStepsShowMapSubmissions(mission.steps),
      stepsShowMapConfig: getStepsShowMapConfig(mission.steps),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.deleteMission = async (req, res) => {
  try {
    const mission = await Mission.findByIdAndDelete(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: "Nhiệm vụ không tồn tại" });
    }
    res.json({ message: "Xóa nhiệm vụ thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Upload ảnh lên ImgBB, dùng cho step type image_upload.
 * Body: { image: "base64 string" } hoặc { image: "data:image/png;base64,..." }
 */
exports.uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Thiếu trường image (base64)" });
    }

    const result = await uploadImage(image);
    res.json({
      message: "Upload ảnh thành công",
      url: result.url,
      displayUrl: result.displayUrl,
      deleteUrl: result.deleteUrl,
    });
  } catch (error) {
    const status = error.status || 500;
    const message =
      error.response?.data?.error?.message || error.message || "Upload ảnh thất bại";
    res.status(status).json({ error: message });
  }
};
