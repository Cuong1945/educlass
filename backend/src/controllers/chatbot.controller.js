const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Score = require('../models/Score');
const jwt = require('jsonwebtoken');

// ── Gemini Setup ─────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Tool definitions (function calling) ──────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: 'count_students',
        description: 'Count total students, optionally filtered by class name',
        parameters: {
          type: 'OBJECT',
          properties: {
            className: {
              type: 'STRING',
              description: 'Optional class name to filter (e.g. HSK1, HSK3)',
            },
          },
        },
      },
      {
        name: 'list_classes',
        description: 'List all classes with teacher info and student count',
        parameters: {
          type: 'OBJECT',
          properties: {
            level: {
              type: 'STRING',
              description: 'Optional level to filter (e.g. HSK1, HSK2)',
            },
          },
        },
      },
      {
        name: 'get_student_info',
        description: 'Search students by name or phone number. Returns student info with class details.',
        parameters: {
          type: 'OBJECT',
          properties: {
            keyword: {
              type: 'STRING',
              description: 'Student name or phone number to search',
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'search_teachers',
        description: 'Search teachers by name, email, or phone number. Returns teacher info with assigned classes.',
        parameters: {
          type: 'OBJECT',
          properties: {
            keyword: {
              type: 'STRING',
              description: 'Teacher name, email, or phone to search',
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'get_class_details',
        description: 'Get detailed information about a specific class including its students, teacher, scores, and attendance summary.',
        parameters: {
          type: 'OBJECT',
          properties: {
            className: {
              type: 'STRING',
              description: 'Class name to look up (e.g. HSK1, HSK3)',
            },
          },
          required: ['className'],
        },
      },
      {
        name: 'get_student_full_record',
        description: 'Get complete academic record for a student: personal info, scores (midterm, final, oral, average), and attendance history.',
        parameters: {
          type: 'OBJECT',
          properties: {
            studentName: {
              type: 'STRING',
              description: 'Student name to look up',
            },
          },
          required: ['studentName'],
        },
      },
      {
        name: 'get_attendance_summary',
        description: 'Get attendance summary optionally filtered by class name or student name.',
        parameters: {
          type: 'OBJECT',
          properties: {
            className: {
              type: 'STRING',
              description: 'Optional class name to filter',
            },
            studentName: {
              type: 'STRING',
              description: 'Optional student name to filter',
            },
          },
        },
      },
      {
        name: 'get_score_summary',
        description: 'Get score summary with pass/fail stats, optionally filtered by class or student.',
        parameters: {
          type: 'OBJECT',
          properties: {
            className: {
              type: 'STRING',
              description: 'Optional class name to filter',
            },
            studentName: {
              type: 'STRING',
              description: 'Optional student name to filter',
            },
          },
        },
      },
      {
        name: 'get_rankings',
        description: 'Get student rankings by score or attendance. Can filter by class.',
        parameters: {
          type: 'OBJECT',
          properties: {
            type: {
              type: 'STRING',
              description: 'Ranking type: "top_scores", "lowest_scores", "most_absent", "best_attendance"',
            },
            className: {
              type: 'STRING',
              description: 'Optional class name to filter rankings',
            },
            limit: {
              type: 'NUMBER',
              description: 'Number of results to return (default 10)',
            },
          },
        },
      },
      {
        name: 'get_absent_students',
        description: 'Get students with the most absences',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: {
              type: 'NUMBER',
              description: 'Number of results to return (default 10)',
            },
            className: {
              type: 'STRING',
              description: 'Optional class name filter',
            },
          },
        },
      },
      {
        name: 'get_statistics',
        description: 'Get statistical analysis: overview, class comparison, attendance analysis, score analysis.',
        parameters: {
          type: 'OBJECT',
          properties: {
            type: {
              type: 'STRING',
              description: 'Stats type: "overview", "class_comparison", "attendance_analysis", "score_analysis"',
            },
          },
          required: ['type'],
        },
      },
      {
        name: 'get_dashboard_stats',
        description: 'Get overall system statistics: total users, teachers, classes, students',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
    ],
  },
];

// ── Helper: Load snapshot từ DB ───────────────────────────────────────
async function loadSnapshot() {
  const [users, classes, students, attendances, scores] = await Promise.all([
    User.find().lean(),
    Class.find().populate('teacher', 'fullName username email').lean(),
    Student.find().populate('classId', 'className level').lean(),
    Attendance.find().populate('studentId', 'name').populate('classId', 'className').lean(),
    Score.find().populate('studentId', 'name').populate('classId', 'className').lean(),
  ]);
  return { users, classes, students, attendances, scores };
}

// ── Tool implementations ──────────────────────────────────────────────
async function executeFunction(name, args) {
  try {
    switch (name) {
      case 'count_students': {
        const filter = {};
        if (args.className) {
          const cls = await Class.findOne({
            className: { $regex: args.className, $options: 'i' },
          });
          if (!cls) return { error: `Không tìm thấy lớp "${args.className}"` };
          filter.classId = cls._id;
        }
        const count = await Student.countDocuments(filter);
        return { count, className: args.className || 'Tất cả' };
      }

      case 'list_classes': {
        const filter = {};
        if (args.level) filter.level = args.level.toUpperCase();
        const classes = await Class.find(filter)
          .populate('teacher', 'fullName username')
          .lean();
        const result = [];
        for (const c of classes) {
          const studentCount = await Student.countDocuments({ classId: c._id });
          result.push({
            className: c.className,
            level: c.level,
            schedule: c.schedule,
            capacity: c.capacity,
            currentStudents: studentCount,
            teacher: c.teacher ? c.teacher.fullName || c.teacher.username : 'Chưa phân công',
          });
        }
        return { classes: result, total: result.length };
      }

      case 'get_student_info': {
        const students = await Student.find({
          $or: [
            { name: { $regex: args.keyword, $options: 'i' } },
            { phone: { $regex: args.keyword, $options: 'i' } },
          ],
        })
          .populate('classId', 'className level')
          .lean();
        return {
          students: students.map((s) => ({
            name: s.name,
            phone: s.phone,
            dob: s.dob,
            class: s.classId?.className || 'N/A',
            level: s.classId?.level || 'N/A',
            parentName: s.parentName || '',
            parentPhone: s.parentPhone || '',
          })),
          total: students.length,
        };
      }

      case 'search_teachers': {
        const teachers = await User.find({
          role: 'TEACHER',
          $or: [
            { fullName: { $regex: args.keyword, $options: 'i' } },
            { username: { $regex: args.keyword, $options: 'i' } },
            { email: { $regex: args.keyword, $options: 'i' } },
            { phone: { $regex: args.keyword, $options: 'i' } },
          ],
        }).lean();

        const result = [];
        for (const t of teachers) {
          const classes = await Class.find({ teacher: t._id }).lean();
          result.push({
            name: t.fullName || t.username,
            email: t.email,
            phone: t.phone || 'N/A',
            enabled: t.enabled,
            classes: classes.map((c) => c.className),
            totalClasses: classes.length,
          });
        }
        return { teachers: result, total: result.length };
      }

      case 'get_class_details': {
        const cls = await Class.findOne({
          className: { $regex: args.className, $options: 'i' },
        })
          .populate('teacher', 'fullName username email')
          .lean();

        if (!cls) return { error: `Không tìm thấy lớp "${args.className}"` };

        const students = await Student.find({ classId: cls._id }).lean();

        const [scores, attendances] = await Promise.all([
          Score.find({ classId: cls._id }).populate('studentId', 'name').lean(),
          Attendance.find({ classId: cls._id }).lean(),
        ]);

        const present = attendances.filter((a) => a.status === 'PRESENT').length;
        const avgScore =
          scores.length > 0
            ? Math.round((scores.reduce((sum, s) => sum + s.average, 0) / scores.length) * 100) / 100
            : null;

        return {
          className: cls.className,
          level: cls.level,
          schedule: cls.schedule,
          capacity: cls.capacity,
          teacher: cls.teacher ? cls.teacher.fullName || cls.teacher.username : 'Chưa phân công',
          teacherEmail: cls.teacher?.email || 'N/A',
          studentCount: students.length,
          students: students.map((s) => ({ name: s.name, phone: s.phone })),
          averageScore: avgScore,
          passRate:
            scores.length > 0
              ? Math.round((scores.filter((s) => s.average >= 50).length / scores.length) * 100) + '%'
              : 'N/A',
          attendanceRate:
            attendances.length > 0
              ? Math.round((present / attendances.length) * 100) + '%'
              : 'N/A',
        };
      }

      case 'get_student_full_record': {
        const student = await Student.findOne({
          name: { $regex: args.studentName, $options: 'i' },
        })
          .populate('classId', 'className level')
          .lean();

        if (!student) return { error: `Không tìm thấy học sinh "${args.studentName}"` };

        const [score, attendances] = await Promise.all([
          Score.findOne({ studentId: student._id }).lean(),
          Attendance.find({ studentId: student._id }).sort({ date: -1 }).lean(),
        ]);

        const present = attendances.filter((a) => a.status === 'PRESENT').length;
        const absent = attendances.filter((a) => a.status === 'ABSENT').length;

        return {
          name: student.name,
          phone: student.phone,
          dob: student.dob,
          parentName: student.parentName || 'N/A',
          parentPhone: student.parentPhone || 'N/A',
          class: student.classId?.className || 'N/A',
          level: student.classId?.level || 'N/A',
          scores: score
            ? {
                midterm: score.midterm,
                final: score.final,
                oral: score.oral,
                average: score.average,
                passed: score.average >= 50,
              }
            : null,
          attendance: {
            total: attendances.length,
            present,
            absent,
            rate: attendances.length > 0 ? Math.round((present / attendances.length) * 100) + '%' : 'N/A',
            recentHistory: attendances.slice(0, 10).map((a) => ({
              date: new Date(a.date).toLocaleDateString('vi-VN'),
              status: a.status === 'PRESENT' ? 'Có mặt' : 'Vắng',
            })),
          },
        };
      }

      case 'get_attendance_summary': {
        const pipeline = [];

        if (args.className) {
          const cls = await Class.findOne({
            className: { $regex: args.className, $options: 'i' },
          });
          if (!cls) return { error: `Không tìm thấy lớp "${args.className}"` };
          pipeline.push({ $match: { classId: cls._id } });
        }

        if (args.studentName) {
          const students = await Student.find({
            name: { $regex: args.studentName, $options: 'i' },
          });
          if (students.length === 0)
            return { error: `Không tìm thấy học sinh "${args.studentName}"` };
          const ids = students.map((s) => s._id);
          pipeline.push({ $match: { studentId: { $in: ids } } });
        }

        pipeline.push({ $group: { _id: '$status', count: { $sum: 1 } } });

        const result = await Attendance.aggregate(pipeline);
        const present = result.find((r) => r._id === 'PRESENT')?.count || 0;
        const absent = result.find((r) => r._id === 'ABSENT')?.count || 0;
        const total = present + absent;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        return { present, absent, total, attendanceRate: `${rate}%` };
      }

      case 'get_score_summary': {
        const matchFilter = {};

        if (args.className) {
          const cls = await Class.findOne({
            className: { $regex: args.className, $options: 'i' },
          });
          if (!cls) return { error: `Không tìm thấy lớp "${args.className}"` };
          matchFilter.classId = cls._id;
        }

        if (args.studentName) {
          const students = await Student.find({
            name: { $regex: args.studentName, $options: 'i' },
          });
          if (students.length === 0)
            return { error: `Không tìm thấy học sinh "${args.studentName}"` };
          matchFilter.studentId = { $in: students.map((s) => s._id) };
        }

        const scores = await Score.find(matchFilter).populate('studentId', 'name').lean();

        if (scores.length === 0) return { message: 'Không có dữ liệu điểm' };

        let totalAvg = 0;
        let passed = 0;
        let failed = 0;
        const details = scores.map((s) => {
          totalAvg += s.average;
          if (s.average >= 50) passed++;
          else failed++;
          return {
            name: s.studentId?.name || 'N/A',
            midterm: s.midterm,
            final: s.final,
            oral: s.oral,
            average: s.average,
            passed: s.average >= 50,
          };
        });

        return {
          totalStudents: scores.length,
          classAverage: Math.round((totalAvg / scores.length) * 100) / 100,
          passed,
          failed,
          passRate: Math.round((passed / scores.length) * 100) + '%',
          details,
        };
      }

      case 'get_rankings': {
        const limit = args.limit || 10;
        const snapshot = await loadSnapshot();
        let filtered = snapshot.scores;

        if (args.className) {
          const cls = snapshot.classes.find((c) =>
            c.className.toLowerCase().includes(args.className.toLowerCase())
          );
          if (cls) {
            filtered = filtered.filter(
              (s) => s.classId?._id?.toString() === cls._id.toString()
            );
          }
        }

        switch (args.type) {
          case 'top_scores':
            return {
              ranking: filtered
                .sort((a, b) => b.average - a.average)
                .slice(0, limit)
                .map((s, i) => ({
                  rank: i + 1,
                  name: s.studentId?.name || 'N/A',
                  class: s.classId?.className || 'N/A',
                  average: s.average,
                  midterm: s.midterm,
                  final: s.final,
                })),
            };

          case 'lowest_scores':
            return {
              ranking: filtered
                .sort((a, b) => a.average - b.average)
                .slice(0, limit)
                .map((s, i) => ({
                  rank: i + 1,
                  name: s.studentId?.name || 'N/A',
                  class: s.classId?.className || 'N/A',
                  average: s.average,
                })),
            };

          case 'most_absent': {
            const absentMap = {};
            let attRecords = snapshot.attendances;
            if (args.className) {
              const cls = snapshot.classes.find((c) =>
                c.className.toLowerCase().includes(args.className.toLowerCase())
              );
              if (cls)
                attRecords = attRecords.filter(
                  (a) => a.classId?._id?.toString() === cls._id.toString()
                );
            }
            attRecords
              .filter((a) => a.status === 'ABSENT')
              .forEach((a) => {
                const sid = a.studentId?._id?.toString();
                if (sid) absentMap[sid] = (absentMap[sid] || 0) + 1;
              });

            const sorted = Object.entries(absentMap)
              .sort(([, a], [, b]) => b - a)
              .slice(0, limit);

            return {
              ranking: sorted.map(([sid, count], i) => {
                const student = snapshot.students.find((s) => s._id.toString() === sid);
                return {
                  rank: i + 1,
                  name: student?.name || 'N/A',
                  class: student?.classId?.className || 'N/A',
                  absentCount: count,
                };
              }),
            };
          }

          case 'best_attendance': {
            const rateMap = {};
            let attRecords = snapshot.attendances;
            if (args.className) {
              const cls = snapshot.classes.find((c) =>
                c.className.toLowerCase().includes(args.className.toLowerCase())
              );
              if (cls)
                attRecords = attRecords.filter(
                  (a) => a.classId?._id?.toString() === cls._id.toString()
                );
            }
            attRecords.forEach((a) => {
              const sid = a.studentId?._id?.toString();
              if (sid) {
                if (!rateMap[sid]) rateMap[sid] = { present: 0, total: 0 };
                rateMap[sid].total++;
                if (a.status === 'PRESENT') rateMap[sid].present++;
              }
            });

            const sorted = Object.entries(rateMap)
              .map(([sid, data]) => ({ sid, rate: data.present / data.total, ...data }))
              .sort((a, b) => b.rate - a.rate)
              .slice(0, limit);

            return {
              ranking: sorted.map((item, i) => {
                const student = snapshot.students.find((s) => s._id.toString() === item.sid);
                return {
                  rank: i + 1,
                  name: student?.name || 'N/A',
                  class: student?.classId?.className || 'N/A',
                  attendanceRate: Math.round(item.rate * 100) + '%',
                  present: item.present,
                  total: item.total,
                };
              }),
            };
          }

          default:
            return { error: `Loại xếp hạng không hợp lệ: ${args.type}` };
        }
      }

      case 'get_absent_students': {
        const limit = args.limit || 10;
        const filter = {};

        if (args.className) {
          const cls = await Class.findOne({
            className: { $regex: args.className, $options: 'i' },
          });
          if (!cls) return { error: `Không tìm thấy lớp "${args.className}"` };
          filter.classId = cls._id;
        }

        filter.status = 'ABSENT';

        const absentRecords = await Attendance.find(filter)
          .populate('studentId', 'name classId')
          .lean();

        const absentMap = {};
        for (const record of absentRecords) {
          const sid = record.studentId?._id?.toString();
          if (!sid) continue;
          if (!absentMap[sid]) {
            absentMap[sid] = { student: record.studentId, count: 0 };
          }
          absentMap[sid].count++;
        }

        const sorted = Object.values(absentMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        const result = [];
        for (const item of sorted) {
          const student = await Student.findById(item.student._id)
            .populate('classId', 'className')
            .lean();
          result.push({
            name: student?.name || 'N/A',
            class: student?.classId?.className || 'N/A',
            absentCount: item.count,
          });
        }

        return { students: result, total: result.length };
      }

      case 'get_statistics': {
        const snapshot = await loadSnapshot();

        switch (args.type) {
          case 'overview': {
            const teachers = snapshot.users.filter((u) => u.role === 'TEACHER');
            const totalAvg =
              snapshot.scores.length > 0
                ? Math.round(
                    (snapshot.scores.reduce((s, sc) => s + sc.average, 0) / snapshot.scores.length) * 100
                  ) / 100
                : 0;
            const totalPresent = snapshot.attendances.filter((a) => a.status === 'PRESENT').length;

            return {
              totalTeachers: teachers.length,
              activeTeachers: teachers.filter((t) => t.enabled).length,
              disabledTeachers: teachers.filter((t) => !t.enabled).length,
              totalClasses: snapshot.classes.length,
              totalStudents: snapshot.students.length,
              overallAverageScore: totalAvg,
              overallPassRate:
                snapshot.scores.length > 0
                  ? Math.round(
                      (snapshot.scores.filter((s) => s.average >= 50).length / snapshot.scores.length) * 100
                    ) + '%'
                  : 'N/A',
              overallAttendanceRate:
                snapshot.attendances.length > 0
                  ? Math.round((totalPresent / snapshot.attendances.length) * 100) + '%'
                  : 'N/A',
            };
          }

          case 'class_comparison': {
            return {
              classes: snapshot.classes.map((c) => {
                const classScores = snapshot.scores.filter(
                  (sc) => sc.classId?._id?.toString() === c._id.toString()
                );
                const classAtt = snapshot.attendances.filter(
                  (a) => a.classId?._id?.toString() === c._id.toString()
                );
                const classStudents = snapshot.students.filter(
                  (s) => s.classId?._id?.toString() === c._id.toString()
                );
                const present = classAtt.filter((a) => a.status === 'PRESENT').length;
                const avgScore =
                  classScores.length > 0
                    ? Math.round(
                        (classScores.reduce((sum, s) => sum + s.average, 0) / classScores.length) * 100
                      ) / 100
                    : 0;
                const passed = classScores.filter((s) => s.average >= 50).length;

                return {
                  className: c.className,
                  level: c.level,
                  teacher: c.teacher?.fullName || c.teacher?.username || 'N/A',
                  studentCount: classStudents.length,
                  averageScore: avgScore,
                  passRate:
                    classScores.length > 0
                      ? Math.round((passed / classScores.length) * 100) + '%'
                      : 'N/A',
                  attendanceRate:
                    classAtt.length > 0
                      ? Math.round((present / classAtt.length) * 100) + '%'
                      : 'N/A',
                };
              }),
            };
          }

          case 'attendance_analysis': {
            const byDate = {};
            snapshot.attendances.forEach((a) => {
              const dateKey = new Date(a.date).toISOString().split('T')[0];
              if (!byDate[dateKey]) byDate[dateKey] = { present: 0, absent: 0 };
              if (a.status === 'PRESENT') byDate[dateKey].present++;
              else byDate[dateKey].absent++;
            });

            return {
              totalRecords: snapshot.attendances.length,
              totalPresent: snapshot.attendances.filter((a) => a.status === 'PRESENT').length,
              totalAbsent: snapshot.attendances.filter((a) => a.status === 'ABSENT').length,
              byDate: Object.entries(byDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 10)
                .map(([date, data]) => ({
                  date,
                  present: data.present,
                  absent: data.absent,
                  rate: Math.round((data.present / (data.present + data.absent)) * 100) + '%',
                })),
            };
          }

          case 'score_analysis': {
            const ranges = { excellent: 0, good: 0, average: 0, belowAverage: 0, fail: 0 };
            snapshot.scores.forEach((s) => {
              if (s.average >= 90) ranges.excellent++;
              else if (s.average >= 70) ranges.good++;
              else if (s.average >= 50) ranges.average++;
              else if (s.average >= 30) ranges.belowAverage++;
              else ranges.fail++;
            });

            const highest =
              snapshot.scores.length > 0
                ? snapshot.scores.reduce((max, s) => (s.average > max.average ? s : max))
                : null;
            const lowest =
              snapshot.scores.length > 0
                ? snapshot.scores.reduce((min, s) => (s.average < min.average ? s : min))
                : null;

            return {
              totalScored: snapshot.scores.length,
              distribution: {
                'Xuất sắc (90-100)': ranges.excellent,
                'Giỏi (70-89)': ranges.good,
                'Trung bình (50-69)': ranges.average,
                'Yếu (30-49)': ranges.belowAverage,
                'Kém (<30)': ranges.fail,
              },
              highest: highest
                ? { name: highest.studentId?.name, class: highest.classId?.className, average: highest.average }
                : null,
              lowest: lowest
                ? { name: lowest.studentId?.name, class: lowest.classId?.className, average: lowest.average }
                : null,
            };
          }

          default:
            return { error: `Loại thống kê không hợp lệ: ${args.type}` };
        }
      }

      case 'get_dashboard_stats': {
        const [totalUsers, totalTeachers, totalClasses, totalStudents] = await Promise.all([
          User.countDocuments(),
          User.countDocuments({ role: 'TEACHER' }),
          Class.countDocuments(),
          Student.countDocuments(),
        ]);
        return { totalUsers, totalTeachers, totalClasses, totalStudents };
      }

      default:
        return { error: `Unknown function: ${name}` };
    }
  } catch (err) {
    console.error(`Error in ${name}:`, err.message);
    return { error: `Lỗi khi thực hiện ${name}: ${err.message}` };
  }
}

// ── Chat endpoint ─────────────────────────────────────────────────────
const chat = async (req, res) => {
  const { message, history } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống.' });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Dịch vụ AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.' });
    }

    // Check authentication (optional)
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        currentUser = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        // Guest user — bỏ qua lỗi token
      }
    }

    const modelConfig = {
      model: 'gemini-3.1-flash-lite',
    };
    if (currentUser) modelConfig.tools = tools;

    const model = genAI.getGenerativeModel({
      ...modelConfig,
      systemInstruction: `Bạn là trợ lý AI chuyên nghiệp của hệ thống quản lý giáo dục EduClass.
${
  currentUser
    ? `Đối tượng hỗ trợ: ${currentUser.role}. Bạn có quyền truy cập dữ liệu hệ thống. Khi người dùng hỏi về thông tin thực tế, hãy sử dụng công cụ ngay lập tức để phản hồi chính xác.`
    : `Đối tượng hỗ trợ: Khách hàng/Khách vãng lai. Giải đáp thông tin chung về EduClass, khóa học tiếng Trung HSK, học phí và lịch trình. Tuyệt đối không cung cấp dữ liệu nội bộ (điểm số, thông tin học viên) cho khách chưa đăng nhập.`
}

Nguyên tắc phản hồi:
1. NGẮN GỌN: Đi thẳng vào vấn đề, tránh diễn giải dài dòng.
2. CHUYÊN NGHIỆP: Ngôn ngữ trang trọng, lịch sự, chuẩn mực sư phạm. Xưng "Tôi", gọi "Bạn" hoặc "Anh/Chị".
3. TRUNG THỰC: Không bịa đặt dữ liệu. Nếu không có dữ liệu từ công cụ, hãy xác nhận không tìm thấy.
4. ĐỊNH DẠNG: Sử dụng Markdown (**in đậm**, danh sách gạch đầu dòng) để thông tin dễ nhìn.
5. TẬP TRUNG: Chỉ trả lời các vấn đề liên quan đến EduClass và học thuật. Từ chối lịch sự các chủ đề ngoài lề.`,
    });

    // Build chat history
    const rawHistory = history || [];
    const chatHistory = [];

    for (const h of rawHistory) {
      const role = h.role === 'user' ? 'user' : 'model';
      const text = String(h.text);
      if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === role) {
        chatHistory[chatHistory.length - 1].parts[0].text += '\n' + text;
      } else {
        chatHistory.push({ role, parts: [{ text }] });
      }
    }

    const chatSession = model.startChat({ history: chatHistory });

    // Send message
    let result = await chatSession.sendMessage(message);
    let response = result.response;

    // Handle function calls (loop for multi-step)
    let maxIterations = 5;
    while (maxIterations-- > 0) {
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const functionCallPart = parts.find((p) => p.functionCall);
      if (!functionCallPart) break;

      const { name, args } = functionCallPart.functionCall;
      console.log(`🤖 Calling: ${name}`, JSON.stringify(args).substring(0, 100));

      const functionResult = await executeFunction(name, args || {});

      result = await chatSession.sendMessage([
        {
          functionResponse: {
            name,
            response: functionResult,
          },
        },
      ]);
      response = result.response;
    }

    const text = response.text();
    res.json({ reply: text });
  } catch (error) {
    console.error('Chatbot Error:', error.message);
    res.status(200).json({
      reply: `Đã xảy ra lỗi kỹ thuật trong quá trình xử lý. Vui lòng thử lại sau. (Chi tiết: ${error.message})`,
      debug_error: error.message,
    });
  }
};

module.exports = { chat };