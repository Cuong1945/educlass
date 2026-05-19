const express = require('express');
const { globalSearch } = require('../controllers/search.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Allow both ADMIN and TEACHER to access
router.get('/', verifyToken, globalSearch);

module.exports = router;
