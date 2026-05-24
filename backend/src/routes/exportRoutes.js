const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// @route   GET /api/export/:quizId/csv
router.get('/:quizId/csv', verifyToken, requireRole(['teacher']), exportController.exportCSV);

// @route   GET /api/export/:quizId/pdf
router.get('/:quizId/pdf', verifyToken, requireRole(['teacher']), exportController.exportPDF);

// @route   POST /api/export/:quizId/email-all
router.post('/:quizId/email-all', verifyToken, requireRole(['teacher']), exportController.exportEmailAll);

// @route   POST /api/export/:quizId/email-single/:attemptId
router.post('/:quizId/email-single/:attemptId', verifyToken, requireRole(['teacher']), exportController.exportEmailSingle);

module.exports = router;
