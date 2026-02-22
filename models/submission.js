const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  missionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mission",
    required: true,
  },
  /** Nội dung bài làm theo từng step: [{ stepIndex: 0, value: ... }, ...] */
  answers: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  status: {
    type: String,
    enum: ["submitted", "graded"],
    default: "submitted",
  },
  /** Điểm nhận được khi được xác nhận (= mission.points lúc confirm, chỉ có khi status === "graded") */
  score: { type: Number, default: null },
  gradedAt: { type: Date, default: null },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  submittedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

submissionSchema.index({ userId: 1, missionId: 1 });
submissionSchema.index({ userId: 1 });
submissionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Submission", submissionSchema);
