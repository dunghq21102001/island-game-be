const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Submission = require("../models/submission.js");

/** Trả về map { userIdString: totalTimeSpentSeconds } cho các user có submission graded */
async function getTotalTimeSpentByUserIds(userIds) {
  if (!userIds?.length) return {};
  const timeSums = await Submission.aggregate([
    { $match: { userId: { $in: userIds }, status: "graded" } },
    { $group: { _id: "$userId", totalTimeSpentSeconds: { $sum: { $ifNull: ["$timeSpentSeconds", 0] } } } },
  ]);
  const timeByUser = {};
  timeSums.forEach((t) => {
    timeByUser[t._id.toString()] = t.totalTimeSpentSeconds;
  });
  return timeByUser;
}

exports.createUser = async (req, res) => {
  try {
    const { username, password, email, mentorId } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      email: email?.toLowerCase(),
      role: "user",
      mentorId,
      tasksCompleted: 0,
      points: 0,
    });

    await user.save();

    res.status(201).json({
      message: "Tạo người dùng thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select("-password")
      .populate("mentorId", "-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

// Lấy list user (role=user) theo mentorId, sắp xếp points cao -> thấp
exports.getUsersByMentorId = async (req, res) => {
  try {
    const { mentorId } = req.params;

    const users = await User.find({ role: "user", mentorId })
      .select("-password")
      .populate("mentorId", "-password")
      .sort({ points: -1 })
      .lean();

    const userIds = users.map((u) => u._id);
    const timeByUser = await getTotalTimeSpentByUserIds(userIds);

    const result = users.map((u) => ({
      ...u,
      totalTimeSpentSeconds: timeByUser[u._id.toString()] ?? 0,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

// Lấy list tất cả user (role=user), sắp xếp points cao -> thấp (bảng xếp hạng tổng)
exports.getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .populate("mentorId", "-password")
      .sort({ points: -1 })
      .lean();

    const userIds = users.map((u) => u._id);
    const timeByUser = await getTotalTimeSpentByUserIds(userIds);

    const result = users.map((u) => ({
      ...u,
      totalTimeSpentSeconds: timeByUser[u._id.toString()] ?? 0,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username, email, role } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    res.json({ message: "Xóa người dùng thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};
