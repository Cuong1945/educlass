const Student = require('../models/Student');
const Class = require('../models/Class');

const getStudents = async (req, res) => {
  try {
    const { keyword, classId } = req.query;
    const filter = {};

    if (keyword && keyword.trim()) {
      filter.$or = [
        { name: { $regex: keyword.trim(), $options: 'i' } },
        { phone: { $regex: keyword.trim(), $options: 'i' } },
      ];
    }

    if (classId) {
      filter.classId = classId;
    }

    const students = await Student.find(filter)
      .populate('classId', 'className level capacity')
      .sort({ createdAt: -1 });

    res.json(students);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const createStudent = async (req, res) => {
  const { name, dob, phone, classId, parentName, parentPhone } = req.body;

  // Required fields
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({ message: 'Name must be less than 100 characters' });
  }

  if (!dob) {
    return res.status(400).json({ message: 'Invalid date of birth' });
  }

  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
    return res.status(400).json({ message: 'Invalid date of birth' });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  const phoneClean = phone.trim();
  if (!/^\d{10}$/.test(phoneClean)) {
    return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
  }

  if (!classId) {
    return res.status(400).json({ message: 'Class not found' });
  }

  try {
    // Check duplicate phone
    const existingPhone = await Student.findOne({ phone: phoneClean });
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    // Check class exists
    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check capacity
    const currentCount = await Student.countDocuments({ classId });
    if (currentCount >= cls.capacity) {
      return res.status(400).json({ message: 'Class capacity exceeded' });
    }

    await Student.create({
      name: name.trim(),
      dob: dobDate,
      phone: phoneClean,
      classId,
      parentName: parentName ? parentName.trim() : '',
      parentPhone: parentPhone ? parentPhone.trim() : '',
    });

    res.status(201).json({ message: 'Student created successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, dob, phone, classId, parentName, parentPhone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({ message: 'Name must be less than 100 characters' });
  }

  if (!dob) {
    return res.status(400).json({ message: 'Invalid date of birth' });
  }

  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
    return res.status(400).json({ message: 'Invalid date of birth' });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  const phoneClean = phone.trim();
  if (!/^\d{10}$/.test(phoneClean)) {
    return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
  }

  if (!classId) {
    return res.status(400).json({ message: 'Class not found' });
  }

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check duplicate phone (exclude self)
    const existingPhone = await Student.findOne({ phone: phoneClean, _id: { $ne: id } });
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    // Check class exists
    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // If class changed, check attendance and capacity
    if (student.classId.toString() !== classId) {
      let Attendance;
      try { Attendance = require('../models/Attendance'); } catch { Attendance = null; }
      if (Attendance) {
        const hasAttendance = await Attendance.countDocuments({ studentId: id });
        if (hasAttendance > 0) {
          return res.status(400).json({ message: 'Cannot change class after attendance exists' });
        }
      }

      const currentCount = await Student.countDocuments({ classId });
      if (currentCount >= cls.capacity) {
        return res.status(400).json({ message: 'Class capacity exceeded' });
      }
    }

    student.name = name.trim();
    student.dob = dobDate;
    student.phone = phoneClean;
    student.classId = classId;

    await student.save();
    res.json({ message: 'Student updated successfully' });
  } catch {
    res.status(500).json({ message: 'Update failed. Please try again.' });
  }
};

const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check attendance records
    let Attendance;
    try { Attendance = require('../models/Attendance'); } catch { Attendance = null; }
    if (Attendance) {
      const hasAttendance = await Attendance.countDocuments({ studentId: id });
      if (hasAttendance > 0) {
        return res.status(400).json({ message: 'Cannot delete student with attendance records' });
      }
    }

    // Check score records
    let Score;
    try { Score = require('../models/Score'); } catch { Score = null; }
    if (Score) {
      const hasScore = await Score.countDocuments({ studentId: id });
      if (hasScore > 0) {
        return res.status(400).json({ message: 'Cannot delete student with score records' });
      }
    }

    await Student.findByIdAndDelete(id);
    res.json({ message: 'Student deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Unable to delete student. Please try again.' });
  }
};

const getMyStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { classId } = req.query;

    // Get classes assigned to this teacher
    const myClasses = await Class.find({ teacher: teacherId }).select('_id');
    const myClassIds = myClasses.map((c) => c._id);

    if (myClassIds.length === 0) {
      return res.json([]);
    }

    // If classId specified, verify it belongs to this teacher
    if (classId) {
      const isMyClass = myClassIds.some((id) => id.toString() === classId);
      if (!isMyClass) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const filter = { classId: classId ? classId : { $in: myClassIds } };

    const students = await Student.find(filter)
      .populate('classId', 'className level capacity')
      .sort({ name: 1 });

    res.json(students);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStudents, createStudent, updateStudent, deleteStudent, getMyStudents };
