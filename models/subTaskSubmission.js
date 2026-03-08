const mongoose = require("mongoose");

const subTaskSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "SubTask", required: true },
  answers: { type: mongoose.Schema.Types.Mixed, default: [] },
  status: {
    type: String,
    enum: ["submitted", "graded"],
    default: "submitted",
  },
  timeSpentSeconds: { type: Number, default: null },
  score: { type: Number, default: null },
  feedback: { type: String, default: null },
  gradedAt: { type: Date, default: null },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  submittedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

subTaskSubmissionSchema.index({ userId: 1, subTaskId: 1 }, { unique: true });
subTaskSubmissionSchema.index({ userId: 1 });
subTaskSubmissionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("SubTaskSubmission", subTaskSubmissionSchema);
