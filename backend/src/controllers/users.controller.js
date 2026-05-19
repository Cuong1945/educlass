const bcrypt = require('bcryptjs');
const User = require('../models/User');

const getUsers = async (req, res) => {
  try {
    const { keyword, role } = req.query;
    const filter = {};

    if (keyword && keyword.trim()) {
      const kw = keyword.trim();
      filter.$or = [
        { username: { $regex: kw, $options: 'i' } },
        { email: { $regex: kw, $options: 'i' } },
      ];
    }

    if (role && ['ADMIN', 'TEACHER'].includes(role.trim().toUpperCase())) {
      filter.role = role.trim().toUpperCase();
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const createUser = async (req, res) => {
  const { username, password, idCard, fullName, email, phone, dob, gender, role } = req.body;

  if (!username || !email || !password || !role || !idCard || !fullName || !phone || !dob || !gender) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  if (password.trim().length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const existUsername = await User.findOne({ username: username.trim() });
    if (existUsername) return res.status(400).json({ message: 'Username already exists.' });

    const hashed = await bcrypt.hash(password.trim(), 10);
    await User.create({
      username: username.trim(),
      email: email.trim(),
      password: hashed,
      role,
      idCard: idCard.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      dob: new Date(dob),
      gender,
      enabled: true,
    });

    res.status(201).json({ message: 'Account created successfully.' });
  } catch {
    res.status(500).json({ message: 'Xảy ra lỗi khi tạo tài khoản.' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, role, enabled, newPassword } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  if (!['ADMIN', 'TEACHER'].includes(role)) {
    return res.status(400).json({ message: 'Vai trò không hợp lệ' });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const dupUsername = await User.findOne({ username: username.trim(), _id: { $ne: id } });
    if (dupUsername) return res.status(400).json({ message: 'Username đã tồn tại' });

    const dupEmail = await User.findOne({ email: email.trim(), _id: { $ne: id } });
    if (dupEmail) return res.status(400).json({ message: 'Email đã tồn tại' });

    user.username = username.trim();
    user.email = email.trim();
    user.role = role;
    user.enabled = Boolean(enabled);

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      }
      user.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    await user.save();
    res.json({ message: 'Cập nhật người dùng thành công' });
  } catch {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const currentUsername = req.user.username;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    if (user.username.toLowerCase() === currentUsername.toLowerCase()) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản đang đăng nhập' });
    }

    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Không thể xóa admin cuối cùng của hệ thống' });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'Xóa người dùng thành công' });
  } catch {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
