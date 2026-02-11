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
    res.json(missions);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.getMissionById = async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: "Nhiệm vụ không tồn tại" });
    }
    res.json(mission);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.createMission = async (req, res) => {
  try {
    const { mapId, name, description, order, x, y, steps, isActive } = req.body;

    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        error: "Thiếu name hoặc steps. Steps phải là mảng có ít nhất 1 phần tử.",
      });
    }

    const mission = new Mission({
      mapId: mapId || null,
      name,
      description: description || "",
      order: order != null ? Number(order) : 0,
      x: x != null ? Number(x) : 0,
      y: y != null ? Number(y) : 0,
      steps: steps.map((s, i) => ({
        order: s.order != null ? s.order : i + 1,
        type: s.type,
        title: s.title,
        config: s.config || {},
      })),
      isActive: isActive !== false,
    });

    await mission.save();
    res.status(201).json(mission);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.updateMission = async (req, res) => {
  try {
    const { mapId, name, description, order, x, y, steps, isActive } = req.body;
    const updateData = {};

    if (mapId !== undefined) updateData.mapId = mapId || null;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = Number(order);
    if (x !== undefined) updateData.x = Number(x);
    if (y !== undefined) updateData.y = Number(y);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (Array.isArray(steps)) {
      updateData.steps = steps.map((s, i) => ({
        order: s.order != null ? s.order : i + 1,
        type: s.type,
        title: s.title,
        config: s.config || {},
      }));
    }

    const mission = await Mission.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!mission) {
      return res.status(404).json({ error: "Nhiệm vụ không tồn tại" });
    }
    res.json(mission);
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
