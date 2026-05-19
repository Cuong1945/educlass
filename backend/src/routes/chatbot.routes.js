const express = require('express');
const router = express.Router();
const { verifyToken, requireTeacher } = require('../middleware/auth.middleware');
const { chat } = require('../controllers/chatbot.controller');

// POST /api/chatbot - Send message to AI chatbot
router.post('/', chat);

module.exports = router;
