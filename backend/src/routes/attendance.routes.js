const express = require('express');
const { takeAttendance, getAttendance, getAttendanceHistory, getAttendanceReport } = require('../controllers/attendance.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', takeAttendance);
router.get('/', getAttendance);
router.get('/history', getAttendanceHistory);

// Admin route
router.get('/report', requireAdmin, getAttendanceReport);

module.exports = router;
