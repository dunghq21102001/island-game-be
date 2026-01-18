const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/", userController.createUser);
router.get("/", authMiddleware, userController.getAllUsers);
router.put("/:id", authMiddleware, userController.updateUser);
router.delete("/:id", authMiddleware, userController.deleteUser);

module.exports = router;
