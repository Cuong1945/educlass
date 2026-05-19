const express = require('express');
const { getClasses, createClass, updateClass, deleteClass, assignTeacher, getMyClasses } = require('../controllers/classes.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Teacher route (only needs login, not admin)
router.get('/my-classes', verifyToken, getMyClasses);

// Admin routes
router.use(verifyToken, requireAdmin);

router.get('/', getClasses);
router.post('/', createClass);
router.put('/:id', updateClass);
router.put('/:id/assign', assignTeacher);
router.delete('/:id', deleteClass);

module.exports = router;
