const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubtController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/', requireRole('student'), doubtController.createDoubt);
router.get('/:quizId', requireRole('teacher'), doubtController.getDoubtsForQuiz);

module.exports = router;
