const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// All quiz routes require authentication
router.use(verifyToken);

// Teacher only routes
router.post('/', requireRole('teacher'), quizController.createQuiz);
router.get('/my-quizzes', requireRole('teacher'), quizController.getTeacherQuizzes);

// Student only routes
router.post('/join', requireRole('student'), quizController.joinQuiz);
router.get('/:id', requireRole('student'), quizController.getQuizForStudent);
router.post('/:id/submit', requireRole('student'), quizController.submitQuiz);
router.get('/:id/results', requireRole('student'), quizController.getQuizResults);

module.exports = router;
