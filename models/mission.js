const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ["image_upload", "text_list", "star_rating"],
    },
    title: { type: String, required: true },
    config: {
      // image_upload: { count: 1 }
      // text_list: { count: 3, label: "Điểm mạnh" }
      // star_rating: { linkedToStepIndex: 0, maxStars: 5, label: "Mức độ hứng thú" }
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: true }
);

const missionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  order: { type: Number, default: 0 },
  steps: [stepSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

missionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Mission", missionSchema);
