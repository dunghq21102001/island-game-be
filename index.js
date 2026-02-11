const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database.js");
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const missionRoutes = require("./routes/mission.routes.js");
const submissionRoutes = require("./routes/submission.routes.js");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://coral-island-game.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/submissions", submissionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
