require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const User = require('../models/User');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Score = require('../models/Score');

// ── Helpers ──────────────────────────────────────────────────────────
const vnPhone = () =>
  '0' +
  faker.helpers.arrayElement(['3', '5', '7', '8', '9']) +
  faker.string.numeric(8);

const CLASS_NAMES = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'KIDS'];

const SCHEDULES = [
  'Mon-Wed 8:00-9:30',
  'Mon-Wed 10:00-11:30',
  'Tue-Thu 8:00-9:30',
  'Tue-Thu 14:00-15:30',
  'Mon-Wed 18:00-19:30',
  'Sat-Sun 9:00-11:00',
];

// ── Main seed ────────────────────────────────────────────────────────
const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Đã kết nối MongoDB');

  // ──────────────────── 0. XÓA DỮ LIỆU CŨ ────────────────────
  console.log('🗑️  Xóa toàn bộ dữ liệu cũ...');
  await Score.deleteMany({});
  await Attendance.deleteMany({});
  await Student.deleteMany({});
  await Class.deleteMany({});
  await User.deleteMany({});
  console.log('✅ Đã xóa sạch dữ liệu cũ');

  // ──────────────────── 1. ADMIN ────────────────────
  const hashed = await bcrypt.hash('Admin@123', 10);
  await User.create({
    username: 'admin',
    email: 'admin@management.local',
    password: hashed,
    role: 'ADMIN',
    enabled: true,
  });
  console.log('✅ Tạo admin: admin / Admin@123');

  // ──────────────────── 2. TEACHERS (10) ────────────────────
  console.log('🔄 Tạo dữ liệu giáo viên...');
  const defaultPwd = await bcrypt.hash('Teacher@123', 10);
  const teacherDocs = [];

  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    teacherDocs.push({
      username: `teacher_${firstName.toLowerCase()}${faker.string.numeric(3)}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: defaultPwd,
      role: 'TEACHER',
      gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'OTHER']),
      fullName: `${firstName} ${lastName}`,
      idCard: faker.string.numeric(12),
      phone: vnPhone(),
      dob: faker.date.birthdate({ min: 25, max: 55, mode: 'age' }),
      enabled: faker.datatype.boolean({ probability: 0.9 }),
    });
  }

  const teachers = await User.insertMany(teacherDocs);
  console.log(`✅ Đã tạo ${teachers.length} giáo viên (mật khẩu: Teacher@123)`);

  // ──────────────────── 3. CLASSES (10) ────────────────────
  console.log('🔄 Tạo dữ liệu lớp học...');
  const classDocs = CLASS_NAMES.map((name, idx) => {
    // Map HSK level: 1-2 → BEGINNER, 3-4 → INTERMEDIATE, 5-6 → ADVANCED
    const hskNum = parseInt(name.replace('HSK', ''), 10);
    let level;
    if (hskNum <= 2) level = 'BEGINNER';
    else if (hskNum <= 4) level = 'INTERMEDIATE';
    else level = 'ADVANCED';

    return {
      className: name,
      level,
      schedule: SCHEDULES[idx % SCHEDULES.length],
      capacity: faker.number.int({ min: 15, max: 30 }),
      teacher: teachers[idx % teachers.length]._id,
    };
  });

  const classes = await Class.insertMany(classDocs);
  console.log(`✅ Đã tạo ${classes.length} lớp học`);

  // ──────────────────── 4. STUDENTS (60) ────────────────────
  console.log('🔄 Tạo dữ liệu học sinh...');
  const studentDocs = [];

  for (let i = 0; i < 60; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const assignedClass = classes[i % classes.length];

    studentDocs.push({
      name: `${firstName} ${lastName}`,
      dob: faker.date.birthdate({ min: 6, max: 30, mode: 'age' }),
      phone: vnPhone(),
      classId: assignedClass._id,
      parentName: `${faker.person.firstName()} ${lastName}`,
      parentPhone: vnPhone(),
    });
  }

  const students = await Student.insertMany(studentDocs);
  console.log(`✅ Đã tạo ${students.length} học sinh`);

  // ──────────────────── 5. ATTENDANCE ────────────────────
  console.log('🔄 Tạo dữ liệu điểm danh...');
  const attendanceDocs = [];
  const today = new Date();

  for (const student of students) {
    // Tạo điểm danh cho 5 ngày gần nhất
    for (let d = 1; d <= 5; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      // Đặt giờ về 0 để tránh trùng lặp
      date.setHours(0, 0, 0, 0);

      // Tìm teacher phụ trách lớp của student
      const cls = classes.find(
        (c) => c._id.toString() === student.classId.toString()
      );

      attendanceDocs.push({
        studentId: student._id,
        classId: student.classId,
        date,
        status: faker.helpers.weightedArrayElement([
          { value: 'PRESENT', weight: 8 },
          { value: 'ABSENT', weight: 2 },
        ]),
        markedBy: cls ? cls.teacher : teachers[0]._id,
      });
    }
  }

  await Attendance.insertMany(attendanceDocs);
  console.log(`✅ Đã tạo ${attendanceDocs.length} bản ghi điểm danh`);

  // ──────────────────── 6. SCORES ────────────────────
  console.log('🔄 Tạo dữ liệu điểm số...');
  const scoreDocs = [];

  for (const student of students) {
    const cls = classes.find(
      (c) => c._id.toString() === student.classId.toString()
    );

    const midterm = faker.number.int({ min: 30, max: 100 });
    const final_ = faker.number.int({ min: 30, max: 100 });
    const oral = faker.datatype.boolean({ probability: 0.7 })
      ? faker.number.int({ min: 40, max: 100 })
      : null;

    // Tính trung bình
    let average;
    if (oral !== null) {
      average = Math.round((midterm * 0.3 + final_ * 0.5 + oral * 0.2) * 100) / 100;
    } else {
      average = Math.round((midterm * 0.4 + final_ * 0.6) * 100) / 100;
    }

    scoreDocs.push({
      studentId: student._id,
      classId: student.classId,
      markedBy: cls ? cls.teacher : teachers[0]._id,
      midterm,
      final: final_,
      oral,
      average,
    });
  }

  await Score.insertMany(scoreDocs);
  console.log(`✅ Đã tạo ${scoreDocs.length} bản ghi điểm số`);

  // ── Done ───────────────────────────────────────────────────────────
  console.log('\n🎉 Seed hoàn tất!');
  console.log('─────────────────────────────────');
  console.log(`  Admin:      1`);
  console.log(`  Teachers:   ${teachers.length}`);
  console.log(`  Classes:    ${classes.length}`);
  console.log(`  Students:   ${students.length}`);
  console.log(`  Attendance: ${attendanceDocs.length}`);
  console.log(`  Scores:     ${scoreDocs.length}`);
  console.log('─────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed lỗi:', err);
  process.exit(1);
});
