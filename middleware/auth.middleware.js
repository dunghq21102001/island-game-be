const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại' });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

module.exports = authMiddleware;