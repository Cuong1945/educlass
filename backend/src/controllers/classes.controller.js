const Class = require('../models/Class');
const User = require('../models/User');

const getClasses = async (req, res) => {
  try {
    const { keyword, level } = req.query;
    const filter = {};

    if (keyword && keyword.trim()) {
      filter.className = { $regex: keyword.trim(), $options: 'i' };
    }

    if (level && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level.trim().toUpperCase())) {
      filter.level = level.trim().toUpperCase();
    }

    const classes = await Class.find(filter).populate('teacher', 'username fullName').sort({ createdAt: -1 });
    res.json(classes);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const createClass = async (req, res) => {
  const { className, level, schedule, capacity } = req.body;

  if (!className || !level || !schedule || capacity === undefined || capacity === '') {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  if (!['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
    return res.status(400).json({ message: 'Invalid input format.' });
  }

  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap <= 0) {
    return res.status(400).json({ message: 'Capacity must be greater than 0.' });
  }

  if (className.trim().length < 3 || className.trim().length > 50) {
    return res.status(400).json({ message: 'Class name must be between 3 and 50 characters.' });
  }

  try {
    await Class.create({
      className: className.trim(),
      level,
      schedule: schedule.trim(),
      capacity: cap,
    });

    res.status(201).json({ message: 'Class created successfully.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateClass = async (req, res) => {
  const { id } = req.params;
  const { className, level, schedule, capacity } = req.body;

  if (!className || !level || !schedule || capacity === undefined) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  if (!['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
    return res.status(400).json({ message: 'Invalid input format.' });
  }

  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap <= 0) {
    return res.status(400).json({ message: 'Capacity must be greater than 0.' });
  }

  try {
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ message: 'Class does not exist.' });

    cls.className = className.trim();
    cls.level = level;
    cls.schedule = schedule.trim();
    cls.capacity = cap;

    await cls.save();
    res.json({ message: 'Class updated successfully.' });
  } catch {
    res.status(500).json({ message: 'Update failed. Please try again.' });
  }
};

const deleteClass = async (req, res) => {
  const { id } = req.params;

  try {
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ message: 'Class does not exist.' });

    await Class.findByIdAndDelete(id);
    res.json({ message: 'Class deleted successfully.' });
  } catch {
    res.status(500).json({ message: 'Unable to delete class. Please try again.' });
  }
};

const assignTeacher = async (req, res) => {
  const { id } = req.params;
  const { teacherId } = req.body;

  if (!teacherId) {
    return res.status(400).json({ message: 'Please select a Teacher.' });
  }

  try {
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ message: 'Class does not exist.' });

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(400).json({ message: 'Selected user is not a valid Teacher.' });
    }

    cls.teacher = teacherId;
    await cls.save();

    res.json({ message: 'Teacher assigned successfully.' });
  } catch {
    res.status(500).json({ message: 'Unable to assign Teacher. Please try again.' });
  }
};

const getMyClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const classes = await Class.find({ teacher: teacherId })
      .populate('teacher', 'username fullName')
      .sort({ createdAt: -1 });
    res.json(classes);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getClasses, createClass, updateClass, deleteClass, assignTeacher, getMyClasses };
