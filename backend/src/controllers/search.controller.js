const User = require('../models/User');
const Student = require('../models/Student');
const Class = require('../models/Class');

const globalSearch = async (req, res) => {
  try {
    const { keyword, role, classId, level, ageGroup } = req.query;
    const currentUserReqRole = req.user.role; // ADMIN or TEACHER

    let users = [];
    let students = [];

    // --- TEACHER LOGIC ---
    if (currentUserReqRole === 'TEACHER') {
      // Teachers can only search students in their assigned classes
      const assignedClasses = await Class.find({ teacher: req.user.id }).select('_id level');
      const assignedClassIds = assignedClasses.map(c => c._id.toString());

      if (assignedClassIds.length === 0) {
        return res.json([]); // No classes -> no students
      }

      const studentFilter = { classId: { $in: assignedClassIds } };

      if (keyword && keyword.trim()) {
        studentFilter.$or = [
          { name: { $regex: keyword.trim(), $options: 'i' } },
          { phone: { $regex: keyword.trim(), $options: 'i' } }
        ];
      }
      
      if (classId && assignedClassIds.includes(classId)) {
        studentFilter.classId = classId;
      }
      
      const foundStudents = await Student.find(studentFilter)
        .populate('classId', 'className level')
        .lean();

      // Filter by Level & Age (in memory since level is populated)
      students = foundStudents.filter(s => {
        if (!s.classId) return false;
        if (level && s.classId.level !== level) return false;
        
        const age = new Date().getFullYear() - new Date(s.dob).getFullYear();
        if (ageGroup === 'KIDS' && age >= 16) return false;
        if (ageGroup === 'ADULTS' && age < 16) return false;
        
        return true;
      }).map(s => {
        const age = new Date().getFullYear() - new Date(s.dob).getFullYear();
        return {
          id: s._id,
          role: 'STUDENT',
          name: s.name,
          age: age,
          class: s.classId.className,
          level: s.classId.level,
          parentInfo: s.classId.level === 'KIDS' || age < 16 
            ? `${s.parentName || 'N/A'} - ${s.parentPhone || 'N/A'}` 
            : 'N/A'
        };
      });

      if (students.length === 0) return res.status(404).json({ message: 'No matching records found' });
      return res.json(students);
    }

    // --- ADMIN LOGIC ---
    const isSearchTeacher = !role || role === 'ALL' || role === 'TEACHER';
    const isSearchStudent = !role || role === 'ALL' || role === 'STUDENT';

    // Helper kiểm tra 24-char ObjectID hợp lệ
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(keyword?.trim());

    if (isSearchTeacher) {
      const userFilter = { role: 'TEACHER' };
      if (keyword && keyword.trim()) {
        userFilter.$or = [
          { name: { $regex: keyword.trim(), $options: 'i' } },
          { email: { $regex: keyword.trim(), $options: 'i' } },
          { phone: { $regex: keyword.trim(), $options: 'i' } }
        ];
        if (isObjectId) {
          userFilter.$or.push({ _id: keyword.trim() });
        }
      }
      
      let canAddTeacher = true;
      if (ageGroup === 'KIDS' || ageGroup === 'ADULTS') canAddTeacher = false;
      if (level) canAddTeacher = false;

      if (canAddTeacher) {
        const foundUsers = await User.find(userFilter).lean();
        for (const u of foundUsers) {
          const classesTaught = await Class.find({ teacher: u._id });
          if (classId) {
            const teachesClass = classesTaught.some(c => c._id.toString() === classId);
            if (!teachesClass) continue;
          }
          const classNames = classesTaught.map(c => c.className).join(', ') || 'None';
          users.push({
            id: u._id,
            role: 'TEACHER',
            name: u.name,
            age: 'N/A',
            class: classNames,
            level: 'N/A',
            parentInfo: 'N/A'
          });
        }
      }
    }

    if (isSearchStudent) {
      const studentFilter = {};
      if (keyword && keyword.trim()) {
        studentFilter.$or = [
          { name: { $regex: keyword.trim(), $options: 'i' } },
          { phone: { $regex: keyword.trim(), $options: 'i' } }
        ];
        if (isObjectId) {
          studentFilter.$or.push({ _id: keyword.trim() });
        }
      }
      if (classId) studentFilter.classId = classId;

      const foundStudents = await Student.find(studentFilter).populate('classId', 'className level').lean();

      students = foundStudents.filter(s => {
        if (!s.classId) return false;
        if (level && s.classId.level !== level) return false;
        
        const age = new Date().getFullYear() - new Date(s.dob).getFullYear();
        if (ageGroup === 'KIDS' && age >= 16) return false;
        if (ageGroup === 'ADULTS' && age < 16) return false;
        
        return true;
      }).map(s => {
        const age = new Date().getFullYear() - new Date(s.dob).getFullYear();
        return {
          id: s._id,
          role: 'STUDENT',
          name: s.name,
          age: age,
          class: s.classId.className,
          level: s.classId.level,
          parentInfo: s.classId.level === 'KIDS' || age < 16 
            ? `${s.parentName || 'N/A'} - ${s.parentPhone || 'N/A'}` 
            : 'N/A'
        };
      });
    }

    const results = [...users, ...students];

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    if (results.length === 0) {
      return res.status(404).json({ message: 'No matching records found' });
    }

    res.json(results);

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { globalSearch };
