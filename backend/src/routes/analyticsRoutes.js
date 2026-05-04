const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// @route   GET /api/analytics/:quizId
// @desc    Get detailed analytics for a specific quiz
// @access  Teacher only
router.get('/:quizId', verifyToken, requireRole(['teacher']), analyticsController.getQuizAnalytics);

module.exports = router;
