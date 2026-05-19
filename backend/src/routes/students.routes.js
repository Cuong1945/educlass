const express = require('express');
const { getStudents, createStudent, updateStudent, deleteStudent, getMyStudents } = require('../controllers/students.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Teacher route
router.get('/my-students', verifyToken, getMyStudents);

// Admin routes
router.use(verifyToken, requireAdmin);

router.get('/', getStudents);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
