const Score = require('../models/Score');
const Class = require('../models/Class');
const Student = require('../models/Student');

const enterScores = async (req, res) => {
  const teacherId = req.user.id;
  const { classId, records } = req.body;

  if (!classId || !records || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate class
  const cls = await Class.findById(classId);
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  if (!cls.teacher || cls.teacher.toString() !== teacherId) {
    return res.status(403).json({ message: 'You are not assigned to this class' });
  }

  // Check duplicate
  const existing = await Score.findOne({ classId });
  if (existing) {
    return res.status(400).json({ message: 'Scores already entered' });
  }

  const isKidsClass = cls.level === 'KIDS';
  const docsToSave = [];

  for (const r of records) {
    if (!r.studentId) continue;

    const midterm = parseFloat(r.midterm);
    const final = parseFloat(r.final);
    let oral = r.oral !== '' && r.oral !== null && r.oral !== undefined ? parseFloat(r.oral) : null;

    if (isNaN(midterm) || isNaN(final)) {
      return res.status(400).json({ message: 'Score must be a number' });
    }
    if (midterm < 0 || midterm > 100 || final < 0 || final > 100) {
      return res.status(400).json({ message: 'Score must be between 0 and 100' });
    }

    if (isKidsClass) {
      if (oral === null || isNaN(oral)) {
        return res.status(400).json({ message: 'Oral score is required for kids class' });
      }
    }

    if (oral !== null) {
      if (isNaN(oral)) return res.status(400).json({ message: 'Score must be a number' });
      if (oral < 0 || oral > 100) return res.status(400).json({ message: 'Score must be between 0 and 100' });
    }

    // Auto calculate average
    let avg = 0;
    if (oral !== null) {
      avg = (midterm + final + oral) / 3;
    } else {
      avg = (midterm + final) / 2;
    }

    docsToSave.push({
      studentId: r.studentId,
      classId,
      markedBy: teacherId,
      midterm: parseFloat(midterm.toFixed(2)),
      final: parseFloat(final.toFixed(2)),
      oral: oral !== null ? parseFloat(oral.toFixed(2)) : null,
      average: parseFloat(avg.toFixed(2))
    });
  }

  try {
    // Verify students belong to class
    const studentIds = docsToSave.map((d) => d.studentId);
    const students = await Student.find({ _id: { $in: studentIds }, classId });
    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Some students do not belong to this class' });
    }

    await Score.insertMany(docsToSave);
    res.status(201).json({ message: 'Scores saved successfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Scores already entered' });
    }
    res.status(500).json({ message: 'Cannot save scores' });
  }
};

const getClassScores = async (req, res) => {
  const teacherId = req.user.id;
  const { classId } = req.query;

  if (!classId) return res.status(400).json({ message: 'Class is required' });

  const cls = await Class.findById(classId);
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  if (req.user.role === 'TEACHER' && (!cls.teacher || cls.teacher.toString() !== teacherId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const scores = await Score.find({ classId }).populate('studentId', 'name phone').lean();
    res.json(scores);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateScores = async (req, res) => {
  const teacherId = req.user.id;
  const { classId } = req.params;
  const { records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: 'No changes detected' });
  }

  const cls = await Class.findById(classId);
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  if (!cls.teacher || cls.teacher.toString() !== teacherId) {
    return res.status(403).json({ message: 'Permission denied' });
  }

  const existingScores = await Score.find({ classId });
  if (existingScores.length === 0) {
    return res.status(404).json({ message: 'Score record not found' });
  }

  // Check deadline (7 days default logic)
  const firstScore = existingScores[0];
  const editPeriodDays = 7;
  const deadlineDate = new Date(firstScore.createdAt.getTime() + editPeriodDays * 24 * 60 * 60 * 1000);
  
  if (new Date() > deadlineDate) {
    return res.status(400).json({ message: 'Editing period expired' });
  }

  const isKidsClass = cls.level === 'KIDS';
  let hasChanges = false;
  const updates = [];

  for (const r of records) {
    const dbScore = existingScores.find(s => s.studentId.toString() === r.studentId);
    if (!dbScore) continue;

    if (r.midterm === '' || r.midterm === null || r.final === '' || r.final === null) {
      return res.status(400).json({ message: 'Field cannot be empty' });
    }

    const m = parseFloat(r.midterm);
    const f = parseFloat(r.final);
    let o = r.oral !== '' && r.oral !== null && r.oral !== undefined ? parseFloat(r.oral) : null;

    if (isNaN(m) || isNaN(f)) return res.status(400).json({ message: 'Score must be a number' });
    if (m < 0 || m > 100 || f < 0 || f > 100) return res.status(400).json({ message: 'Score must be between 0 and 100' });

    if (isKidsClass && (o === null || isNaN(o))) {
      return res.status(400).json({ message: 'Field cannot be empty' }); // Explicit BRD requirement
    }

    if (o !== null) {
      if (isNaN(o)) return res.status(400).json({ message: 'Score must be a number' });
      if (o < 0 || o > 100) return res.status(400).json({ message: 'Score must be between 0 and 100' });
    }

    // Auto recalculate average
    let avg = 0;
    if (o !== null) {
      avg = (m + f + o) / 3;
    } else {
      avg = (m + f) / 2;
    }

    const nMidterm = parseFloat(m.toFixed(2));
    const nFinal = parseFloat(f.toFixed(2));
    const nOral = o !== null ? parseFloat(o.toFixed(2)) : null;
    const nAvg = parseFloat(avg.toFixed(2));

    // Check if anything actually changed
    if (dbScore.midterm !== nMidterm || dbScore.final !== nFinal || dbScore.oral !== nOral || dbScore.average !== nAvg) {
      hasChanges = true;
      updates.push(Score.updateOne({ _id: dbScore._id }, {
        $set: { midterm: nMidterm, final: nFinal, oral: nOral, average: nAvg }
      }));
    }
  }

  if (!hasChanges) {
    return res.status(400).json({ message: 'No changes detected' });
  }

  try {
    await Promise.all(updates);
    res.json({ message: 'Scores updated successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const getScoreReport = async (req, res) => {
  const { classId } = req.query;

  try {
    let scoresQuery = {};
    let clsName = 'All Classes';
    let levelMap = 'Mixed';

    if (classId) {
      const cls = await Class.findById(classId);
      if (!cls) return res.status(404).json({ message: 'Class not found' });
      scoresQuery = { classId };
      clsName = cls.className;
      levelMap = cls.level;
    }

    const scores = await Score.find(scoresQuery).populate('studentId', 'name phone').lean();
    if (!scores || scores.length === 0) {
      return res.status(404).json({ message: 'No report data available' });
    }

    // Tính Stats (Tổng, Đỗ, Rớt) - Pass mark mặc định = 50
    let totalScore = 0;
    let passed = 0;
    let failed = 0;

    const formattedScores = scores.filter(s => s.studentId).map(s => {
      totalScore += s.average;
      if (s.average >= 50) passed++;
      else failed++;
      return {
        _id: s.studentId._id,
        name: s.studentId.name,
        midterm: s.midterm,
        final: s.final,
        oral: s.oral,
        average: s.average
      };
    });

    const passRate = (passed / formattedScores.length) * 100;
    const classAvg = totalScore / formattedScores.length;

    // Sắp xếp rank
    formattedScores.sort((a, b) => b.average - a.average);
    
    // Gán hạng thứ tự (Ranking), xử lý trùng điểm thì đồng hạng
    let currentRank = 1;
    for (let i = 0; i < formattedScores.length; i++) {
      if (i > 0 && formattedScores[i].average < formattedScores[i - 1].average) {
        currentRank = i + 1;
      }
      formattedScores[i].rank = currentRank;
    }

    res.json({
      classInfo: { className: clsName, level: levelMap },
      stats: {
        totalStudents: formattedScores.length,
        passed,
        failed,
        passRate: parseFloat(passRate.toFixed(2)),
        classAverage: parseFloat(classAvg.toFixed(2))
      },
      ranking: formattedScores
    });

  } catch (err) {
    res.status(500).json({ message: 'Cannot load report' });
  }
};

module.exports = { enterScores, getClassScores, updateScores, getScoreReport };
