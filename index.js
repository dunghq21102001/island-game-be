const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database.js");
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");


const app = express();

connectDB();
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://coral-island-game.netlify.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
