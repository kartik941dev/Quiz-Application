const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedOptionIndex: { type: Number },
  selectedOptionIndices: { type: [Number], default: [] },
  textResponse: { type: String, default: '' },
  timeTaken: { type: Number, default: 0 },
  isCorrect: { type: Boolean, default: false },
  marksAwarded: { type: Number, default: 0 },
  evaluationStatus: { 
    type: String, 
    enum: ['auto_graded', 'pending_review', 'graded'], 
    default: 'auto_graded' 
  },
  teacherFeedback: { type: String, default: '' }
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answers: [answerSchema],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  hasPendingReview: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  tabSwitchCount: { type: Number, default: 0 },
  fastAnswerCount: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure a student can only have one attempt per quiz
quizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
