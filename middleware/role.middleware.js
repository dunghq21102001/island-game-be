/**
 * Chỉ cho phép các role được chỉ định (sau khi đã qua authMiddleware).
 * Ví dụ: requireRole('mentor', 'admin')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Vui lòng đăng nhập" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Bạn không có quyền thực hiện thao tác này",
        requiredRoles: allowedRoles,
      });
    }
    next();
  };
};

module.exports = { requireRole };
