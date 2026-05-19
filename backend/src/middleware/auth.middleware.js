const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Không có token xác thực' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  next();
};

const requireTeacher = (req, res, next) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'TEACHER') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, requireTeacher };
