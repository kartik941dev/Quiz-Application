const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/questionBankController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.use(requireRole('teacher'));

router.post('/', questionBankController.createQuestion);
router.post('/bulk', questionBankController.bulkCreateQuestions);
router.get('/', questionBankController.getQuestions);
router.get('/topics', questionBankController.getTopics);
router.delete('/:id', questionBankController.deleteQuestion);

module.exports = router;
