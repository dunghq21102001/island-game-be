const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/myapp",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("MongoDB đã kết nối");
  } catch (error) {
    console.error("Lỗi kết nối MongoDB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
