const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");


const app = express();

connectDB();
app.use(express.json());
app.use(cors());


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
