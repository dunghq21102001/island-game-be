const UserBadge = require("../models/userBadge.js");
const Submission = require("../models/submission.js");
const SubTaskSubmission = require("../models/subTaskSubmission.js");
const User = require("../models/user.js");

const BADGE_CODES = [
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
];

/** Cấp huy hiệu cho user (idempotent — không tạo trùng). */
async function grantBadge(userId, badgeCode) {
  if (!BADGE_CODES.includes(badgeCode)) return null;
  const existing = await UserBadge.findOne({ userId, badgeCode });
  if (existing) return existing;
  const doc = new UserBadge({ userId, badgeCode });
  await doc.save();
  return doc;
}

/**
 * Khi mentor chấm xong mission: mission.order trong DB là 0-indexed (0..5).
 * Map order 0 -> badge_1, order 1 -> badge_2, ..., order 5 -> badge_6.
 * Nếu mission có order 2 (nhiệm vụ thứ 3) thì kiểm tra thêm "phong vien xuat sac".
 */
async function checkAndGrantMissionBadges(userId, missionOrder) {
  const order = Number(missionOrder);
  if (order < 0 || order > 5) return;
  const badgeIndex = order + 1;
  await grantBadge(userId, `badge_${badgeIndex}`);
}

/**
 * Trong đội mentor (cùng mentorId), ai có submission graded cho missionId sớm nhất (gradedAt nhỏ nhất) được nhận phong_vien_xuat_sac.
 * Gọi sau khi vừa chấm xong một submission của mission (order 3).
 */
async function checkAndGrantPhongVienXuatSac(missionId, mentorId) {
  const usersOfMentor = await User.find({ mentorId, role: "user" })
    .select("_id")
    .lean();

  const userIds = usersOfMentor.map((u) => u._id);
  if (!userIds.length) return;

  // tìm submission được chấm sớm nhất trong team
  const firstGraded = await Submission.findOne({
    missionId,
    userId: { $in: userIds },
    status: "graded",
  })
    .sort({ gradedAt: 1 })
    .select("userId")
    .lean();

  if (!firstGraded) return;

  const fastestUserId = firstGraded.userId;
  const badgeCode = "phong_vien_xuat_sac";

  // xoá badge của các user trong team (trừ người nhanh nhất)
  await UserBadge.deleteMany({
    badgeCode,
    userId: { $in: userIds, $ne: fastestUserId },
  });

  // cấp badge cho người nhanh nhất
  await grantBadge(fastestUserId, badgeCode);
}

/**
 * Khi mentor chấm xong subtask: đếm số subtask đã được chấm (graded) của user.
 * Đủ 1 -> streak_1, đủ 3 -> streak_3, đủ 7 -> streak_7.
 */
async function checkAndGrantStreakBadges(userId) {
  const count = await SubTaskSubmission.countDocuments({
    userId,
    status: "graded",
  });
  if (count >= 1) await grantBadge(userId, "streak_1");
  if (count >= 3) await grantBadge(userId, "streak_3");
  if (count >= 7) await grantBadge(userId, "streak_7");
}

module.exports = {
  grantBadge,
  checkAndGrantMissionBadges,
  checkAndGrantPhongVienXuatSac,
  checkAndGrantStreakBadges,
  BADGE_CODES,
};
