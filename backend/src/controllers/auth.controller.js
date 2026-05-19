const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

const login = async (req, res) => {
  const { username, password, rememberMe } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  try {
    const user = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: username.trim() },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại' });
    }

    if (!user.enabled) {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '7d' : '30m' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập Email' });

  try {
    const user = await User.findOne({ email: email.trim() });
    if (!user) {
      // Vì lý do bảo mật, thỉnh thoảng chúng ta vẫn trả về success hoặc thông báo chung
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }

    // Tạo mật khẩu tạm thời ngẫu nhiên
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 ký tự
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(tempPassword, salt);
    await user.save();

    // Gửi email
    const message = `Chào ${user.fullName || user.username},\n\nYêu cầu khôi phục mật khẩu của bạn đã được xử lý. Mật khẩu tạm thời mới của bạn là: ${tempPassword}\n\nVui lòng đăng nhập và đổi lại mật khẩu ngay lập tức để bảo mật.\n\nTrân trọng,\nEduClass System`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #c8102e; text-align: center;">Khôi phục mật khẩu</h2>
        <p>Chào <strong>${user.fullName || user.username}</strong>,</p>
        <p>Yêu cầu khôi phục mật khẩu của bạn đã được xử lý thành công.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin-bottom: 5px; color: #666;">Mật khẩu tạm thời của bạn là:</p>
          <span style="font-size: 24px; font-weight: bold; color: #333; letter-spacing: 2px;">${tempPassword}</span>
        </div>
        <p style="color: #ff0000; font-size: 13px;">* Vui lòng đăng nhập và đổi lại mật khẩu ngay lập tức để bảo mật tài khoản.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">Đây là email tự động, vui lòng không trả lời.</p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: '[EduClass] Khôi phục mật khẩu tài khoản',
      message: message,
      html: html
    });

    res.json({ message: 'Mật khẩu mới đã được gửi vào Gmail của bạn. Vui lòng kiểm tra hộp thư (bao gồm cả thư rác).' });

  } catch (err) {
    console.error('--- Error in forgotPassword ---');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    if (err.stack) console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Lỗi server hoặc lỗi gửi email: ' + err.message });
  }
};

module.exports = { login, getMe, forgotPassword };
