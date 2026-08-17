const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// All quiz routes require authentication
router.use(verifyToken);

// Teacher only routes
router.post('/', requireRole('teacher'), quizController.createQuiz);
router.get('/my-quizzes', requireRole('teacher'), quizController.getTeacherQuizzes);
router.get('/:id/full', requireRole('teacher'), quizController.getFullQuiz);
router.put('/:id', requireRole('teacher'), quizController.updateQuiz);
router.post('/:id/duplicate', requireRole('teacher'), quizController.duplicateQuiz);
router.patch('/:id/close', requireRole('teacher'), quizController.closeQuiz);
router.get('/:id/evaluations', requireRole('teacher'), quizController.getQuizEvaluations);
router.put('/attempt/:attemptId/grade', requireRole('teacher'), quizController.gradeStudentAttempt);

// Student only routes
router.post('/join', requireRole('student'), quizController.joinQuiz);
router.get('/:id', requireRole('student'), quizController.getQuizForStudent);
router.post('/:id/submit', requireRole('student'), quizController.submitQuiz);
router.get('/:id/results', requireRole('student'), quizController.getQuizResults);

module.exports = router;
