const express = require('express');
const { enterScores, getClassScores, updateScores, getScoreReport } = require('../controllers/scores.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken);

router.get('/report', requireAdmin, getScoreReport);
router.post('/', enterScores);
router.get('/', getClassScores);
router.put('/:classId', updateScores);

module.exports = router;
