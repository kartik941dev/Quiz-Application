const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'true_false', 'fill_in_the_blank', 'essay_code'],
    default: 'single_choice'
  },
  options: {
    type: [String],
    default: []
  },
  correctOptionIndex: { 
    type: Number,
    default: 0
  },
  correctOptionIndices: {
    type: [Number],
    default: []
  },
  acceptedAnswers: {
    type: [String],
    default: []
  },
  codeLanguage: {
    type: String,
    default: 'javascript'
  },
  topic: {
    type: String,
    default: 'General'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  timeLimit: { type: Number, required: true, default: 30 },
  explanation: { type: String, default: '' },
  marks: { type: Number, default: 1, min: 1 },
  negativeMarks: { type: Number, default: 0, min: 0 }
}, { _id: true });

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  joinCode: { type: String, required: true, unique: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  allowReattempt: { type: Boolean, default: false },
  progressionMode: { 
    type: String, 
    enum: ['auto_timer', 'manual', 'self_paced'], 
    default: 'auto_timer' 
  },
  showLeaderboard: { type: Boolean, default: true },
  leaderboardInterval: { type: Number, required: true, default: 1 },
  shuffleQuestions: { type: Boolean, default: true },
  shuffleOptions: { type: Boolean, default: true },
  questions: {
    type: [questionSchema],
    validate: [
      {
        validator: function(v) { return v && v.length > 0; },
        message: 'A quiz must contain at least one question.'
      },
      {
        validator: function(v) {
          return v.every(q => q.negativeMarks <= q.marks);
        },
        message: 'Negative marks cannot exceed question marks.'
      }
    ]
  },
  negativeMarkingEnabled: { type: Boolean, default: false },
  isClosed: { type: Boolean, default: false },
  closedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
