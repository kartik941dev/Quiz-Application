const mongoose = require('mongoose');
const Doubt = require('../models/Doubt');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

exports.createDoubt = async (req, res) => {
  try {
    const { quizId, questionIndex: rawQI, doubtText } = req.body;
    const questionIndex = typeof rawQI === 'string' ? parseInt(rawQI, 10) : Number(rawQI);

    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing quizId' });
    }

    if (!Number.isInteger(questionIndex) || questionIndex < 0) {
      return res.status(400).json({ success: false, message: 'questionIndex must be a non-negative integer' });
    }

    if (typeof doubtText !== 'string' || !doubtText.trim()) {
      return res.status(400).json({ success: false, message: 'doubtText is required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (questionIndex >= quiz.questions.length) {
      return res.status(400).json({ success: false, message: 'questionIndex is out of range for this quiz' });
    }

    const attemptExists = await QuizAttempt.exists({
      quizId,
      studentId: req.user.userId
    });
    if (!attemptExists) {
      return res.status(403).json({ success: false, message: 'You must join this quiz before raising a doubt' });
    }

    const doubt = new Doubt({
      studentId: req.user.userId,
      quizId,
      questionIndex,
      doubtText: doubtText.trim()
    });
    await doubt.save();

    res.status(201).json({
      success: true,
      message: 'Doubt submitted',
      doubt
    });
  } catch (err) {
    console.error('[DOUBT] Create error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit doubt' });
  }
};

exports.getDoubtsForQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: 'Invalid quizId' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.teacherId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only view doubts for your own quizzes' });
    }

    const doubts = await Doubt.find({ quizId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      doubts
    });
  } catch (err) {
    console.error('[DOUBT] Fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doubts' });
  }
};
