const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res
        .status(400)
        .json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "your-secret-key"
    );

    User.findByIdAndUpdate(user._id, {
      lastOnline: new Date().toISOString(),
    }).exec();

    res.json({
      token,
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

exports.getMe = async (req, res) => {
  const user = await req.user.populate("mentorId", "-password");

  res.json({ user });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Cập nhật profile (avatar, username). Chỉ role "user" được gọi API này.
 * User chỉ có thể cập nhật chính mình (req.userId).
 */
exports.updateProfile = async (req, res) => {
  try {
    const { avatar, username } = req.body;
    const updateData = {};

    if (avatar !== undefined) updateData.avatar = avatar;
    if (username !== undefined) {
      if (!username || typeof username !== "string" || !username.trim()) {
        return res.status(400).json({ error: "Username không hợp lệ" });
      }
      const trimmed = username.trim();
      const existing = await User.findOne({
        username: trimmed,
        _id: { $ne: req.userId },
      });
      if (existing) {
        return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
      }
      updateData.username = trimmed;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "Cần gửi ít nhất một trường để cập nhật (avatar hoặc username)",
      });
    }

    const user = await User.findByIdAndUpdate(req.userId, updateData, {
      new: true,
    })
      .select("-password")
      .populate("mentorId", "-password");

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};
