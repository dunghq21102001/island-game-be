const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  lastOnline: { type: String },
  avatar: { type: String },
  points: { type: Number },
  tasksCompleted: { type: Number },

  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },

  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
