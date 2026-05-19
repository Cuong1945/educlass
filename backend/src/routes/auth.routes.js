const express = require('express');
const { login, getMe, forgotPassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', verifyToken, getMe);

module.exports = router;
