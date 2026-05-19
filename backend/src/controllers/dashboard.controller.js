const User = require('../models/User');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Score = require('../models/Score');

const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTeachers = await User.countDocuments({ role: 'TEACHER', enabled: true });
    const totalClasses = await Class.countDocuments();
    const totalStudents = await Student.countDocuments();

    // 1. Phân bổ học sinh theo Level
    const studentsByLevelAggr = await Student.aggregate([
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'classDetails'
        }
      },
      { $unwind: { path: '$classDetails', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$classDetails.level',
          count: { $sum: 1 }
        }
      }
    ]);
    const levelMap = { 'BEGINNER': 0, 'INTERMEDIATE': 0, 'ADVANCED': 0, 'KIDS': 0 };
    studentsByLevelAggr.forEach(item => {
      if (item._id) levelMap[item._id] = item.count;
    });
    const studentsByLevel = Object.keys(levelMap).map(k => ({ level: k, count: levelMap[k] }));

    // 2. Tỉ lệ Đấu/Trượt Toàn Hệ Thống
    const scores = await Score.find({}, 'average').lean();
    let passed = 0;
    let failed = 0;
    scores.forEach(s => {
      if (s.average >= 50) passed++;
      else failed++;
    });

    // 3. Top 5 Thủ Khoa All-Server
    const topStudents = await Score.find()
      .populate('studentId', 'name')
      .populate('classId', 'className')
      .sort({ average: -1 })
      .limit(5)
      .lean();

    // 4. Các lớp Mới nhất được tạo
    const recentClasses = await Class.find()
      .populate('teacher', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      totalUsers,
      totalTeachers,
      totalClasses,
      totalStudents,
      studentsByLevel,
      passFail: { passed, failed, totalScored: scores.length },
      topStudents,
      recentClasses
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Tìm các lớp do giáo viên này phụ trách
    const myClassesData = await Class.find({ teacher: teacherId }).lean();
    const myClassIds = myClassesData.map(c => c._id);
    const totalClasses = myClassIds.length;

    // Tống học sinh
    const totalStudents = await Student.countDocuments({ classId: { $in: myClassIds } });

    // 1. Phân bổ học sinh theo Level (chỉ lấy lớp của giáo viên này)
    const studentsByLevelAggr = await Student.aggregate([
      { $match: { classId: { $in: myClassIds } } },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'classDetails'
        }
      },
      { $unwind: { path: '$classDetails', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$classDetails.level',
          count: { $sum: 1 }
        }
      }
    ]);
    const levelMap = { 'BEGINNER': 0, 'INTERMEDIATE': 0, 'ADVANCED': 0, 'KIDS': 0 };
    studentsByLevelAggr.forEach(item => {
      if (item._id) levelMap[item._id] = item.count;
    });
    const studentsByLevel = Object.keys(levelMap).map(k => ({ level: k, count: levelMap[k] }));

    // 2. Tỉ lệ Đạt/Trượt trong số các điểm được đánh gia cho lớp của giáo viên này
    const scores = await Score.find({ classId: { $in: myClassIds } }, 'average').lean();
    let passed = 0;
    let failed = 0;
    let sumAverage = 0;

    scores.forEach(s => {
      if (s.average >= 50) passed++;
      else failed++;
      sumAverage += s.average;
    });
    
    const avgScore = scores.length > 0 ? (sumAverage / scores.length).toFixed(1) : 0;

    // 3. Top 5 Thủ Khoa trong lớp của giáo viên
    const topStudents = await Score.find({ classId: { $in: myClassIds } })
      .populate('studentId', 'name')
      .populate('classId', 'className')
      .sort({ average: -1 })
      .limit(5)
      .lean();

    // 4. Lớp học giáo viên dạy Mới nhất
    const recentClasses = await Class.find({ teacher: teacherId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ 
      totalClasses,
      totalStudents,
      totalScores: scores.length,
      avgScore,
      studentsByLevel,
      passFail: { passed, failed, totalScored: scores.length },
      topStudents,
      recentClasses
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAdminStats, getTeacherStats };
