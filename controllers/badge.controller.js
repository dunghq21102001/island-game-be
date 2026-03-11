const UserBadge = require("../models/userBadge.js");
const User = require("../models/user.js");

/** Trả về đường dẫn ảnh huy hiệu (tương ứng folder images/). */
function getImagePath(badgeCode) {
  return `/images/${badgeCode}.png`;
}

/**
 * GET /api/badges/:userId
 * Trả về tất cả huy hiệu của user: { badges: [{ badgeCode, imageUrl, earnedAt }] }
 */
exports.getBadgesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("_id").lean();
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    const list = await UserBadge.find({ userId })
      .sort({ earnedAt: 1 })
      .lean();

    const baseUrl = req.protocol + "://" + req.get("host");
    const badges = list.map((b) => ({
      badgeCode: b.badgeCode,
      imageUrl: baseUrl + getImagePath(b.badgeCode),
      earnedAt: b.earnedAt,
    }));

    res.json({ userId, badges });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
};
