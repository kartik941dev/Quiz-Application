const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// @route   GET /api/export/:quizId/csv
router.get('/:quizId/csv', verifyToken, requireRole(['teacher']), exportController.exportCSV);

// @route   GET /api/export/:quizId/pdf
router.get('/:quizId/pdf', verifyToken, requireRole(['teacher']), exportController.exportPDF);

module.exports = router;
