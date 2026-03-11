const mongoose = require("mongoose");

/** Mã huy hiệu: badge_1..badge_6, phong_vien_xuat_sac, streak_1, streak_3, streak_7 */
const userBadgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  badgeCode: {
    type: String,
    required: true,
    enum: [
      "badge_1",
      "badge_2",
      "badge_3",
      "badge_4",
      "badge_5",
      "badge_6",
      "phong_vien_xuat_sac",
      "streak_1",
      "streak_3",
      "streak_7",
    ],
  },
  earnedAt: { type: Date, default: Date.now },
});

userBadgeSchema.index({ userId: 1, badgeCode: 1 }, { unique: true });
userBadgeSchema.index({ userId: 1 });

module.exports = mongoose.model("UserBadge", userBadgeSchema);
