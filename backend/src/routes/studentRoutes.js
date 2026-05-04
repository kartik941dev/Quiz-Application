const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// All student routes require student role
router.use(verifyToken);
router.use(requireRole('student'));

router.get('/dashboard-stats', studentController.getStudentDashboardStats);
router.get('/attempts/my', studentController.getMyAttempts);

module.exports = router;
