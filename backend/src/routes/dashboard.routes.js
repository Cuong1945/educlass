const express = require('express');
const { getAdminStats, getTeacherStats } = require('../controllers/dashboard.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken);
router.get('/teacher', getTeacherStats);
router.get('/admin', requireAdmin, getAdminStats);

module.exports = router;
