const mongoose = require("mongoose");

const subTaskStepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ["image_upload", "text_list", "star_rating", "select_from_step"],
    },
    title: { type: String, required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const subTaskSchema = new mongoose.Schema({
  /** Mentor tạo nhiệm vụ phụ */
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  /** Thành viên được giao (phải đã hoàn thành nhiệm vụ chính mainMissionId) */
  assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  /** Nhiệm vụ chính đã hoàn thành (graded) thì user mới thấy và làm được nhiệm vụ phụ này */
  mainMissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Mission", required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  steps: [subTaskStepSchema],
  points: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

subTaskSchema.index({ mentorId: 1 });
subTaskSchema.index({ assignedToUserId: 1 });
subTaskSchema.index({ mainMissionId: 1 });
subTaskSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("SubTask", subTaskSchema);
