const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Student = require('../models/Student');

const takeAttendance = async (req, res) => {
  const teacherId = req.user.id;
  const { classId, date, records } = req.body;

  if (!classId || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate class belongs to teacher
  const cls = await Class.findById(classId);
  if (!cls) {
    return res.status(404).json({ message: 'Session not found' });
  }
  if (!cls.teacher || cls.teacher.toString() !== teacherId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Validate all records have status
  for (const r of records) {
    if (!r.studentId || !r.status) {
      return res.status(400).json({ message: 'All students must have attendance status' });
    }
    if (!['PRESENT', 'ABSENT'].includes(r.status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
  }

  // Normalize date to start of day
  const sessionDate = new Date(date);
  sessionDate.setHours(0, 0, 0, 0);

  try {
    // Verify all students belong to this class
    const studentIds = records.map((r) => r.studentId);
    const students = await Student.find({ _id: { $in: studentIds }, classId });
    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Student does not belong to this class' });
    }

    // Check if attendance already exists for this date
    const existing = await Attendance.findOne({ classId, date: sessionDate });
    if (existing) {
      return res.status(400).json({ message: 'Attendance already exists' });
    }

    // Save all records
    const docs = records.map((r) => ({
      studentId: r.studentId,
      classId,
      date: sessionDate,
      status: r.status,
      markedBy: teacherId,
    }));

    await Attendance.insertMany(docs);
    res.status(201).json({ message: 'Attendance saved successfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Attendance already exists' });
    }
    res.status(500).json({ message: 'Failed to save attendance' });
  }
};

const getAttendance = async (req, res) => {
  const teacherId = req.user.id;
  const { classId, date } = req.query;

  if (!classId) {
    return res.status(400).json({ message: 'Class is required' });
  }

  // Verify class belongs to teacher
  const cls = await Class.findById(classId);
  if (!cls) {
    return res.status(404).json({ message: 'Session not found' });
  }
  if (!cls.teacher || cls.teacher.toString() !== teacherId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const filter = { classId };
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      filter.date = d;
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'name phone')
      .sort({ date: -1 });

    res.json(records);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAttendanceHistory = async (req, res) => {
  const teacherId = req.user.id;
  const { classId } = req.query;

  if (!classId) {
    return res.status(400).json({ message: 'Class is required' });
  }

  const cls = await Class.findById(classId);
  if (!cls) {
    return res.status(404).json({ message: 'Session not found' });
  }
  if (!cls.teacher || cls.teacher.toString() !== teacherId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const dates = await Attendance.distinct('date', { classId });
    const sorted = dates.sort((a, b) => new Date(b) - new Date(a));
    res.json(sorted);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAttendanceReport = async (req, res) => {
  const { classId } = req.query;

  try {
    let studentsQuery = {};
    let attendanceQuery = {};
    let classInfo = { className: 'All Classes', totalSessions: 0 };
    let datesMap = {};

    if (classId) {
      const cls = await Class.findById(classId);
      if (!cls) return res.status(404).json({ message: 'Class not found' });
      studentsQuery = { classId };
      attendanceQuery = { classId };
      classInfo.className = cls.className;
      
      const dates = await Attendance.distinct('date', { classId });
      classInfo.totalSessions = dates.length;
    } else {
      const aggr = await Attendance.aggregate([
        { $group: { _id: "$classId", dates: { $addToSet: "$date" } } }
      ]);
      aggr.forEach(a => {
        if (a._id) datesMap[a._id.toString()] = a.dates.length;
      });
    }

    const students = await Student.find(studentsQuery).select('_id name phone classId').lean();
    if (!students || students.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    const attendances = await Attendance.find(attendanceQuery).lean();

    const report = students.map(st => {
      const studentAttendances = attendances.filter(a => a.studentId.toString() === st._id.toString());
      let presentCount = 0;
      let absentCount = 0;

      studentAttendances.forEach(a => {
        if (a.status === 'PRESENT') presentCount++;
        else if (a.status === 'ABSENT') absentCount++;
      });

      const stClassId = st.classId ? st.classId.toString() : '';
      const totalForSt = classId ? classInfo.totalSessions : (datesMap[stClassId] || 0);
      
      const rate = totalForSt === 0 ? 0 : Math.round((presentCount / totalForSt) * 100);

      return {
        _id: st._id,
        name: st.name,
        totalSessions: totalForSt,
        present: presentCount,
        absent: absentCount,
        rate
      };
    });

    res.json({
      classInfo,
      report
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { takeAttendance, getAttendance, getAttendanceHistory, getAttendanceReport };
