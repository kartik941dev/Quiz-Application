const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true },
  type: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'true_false', 'fill_in_the_blank', 'essay_code'],
    default: 'single_choice',
    index: true
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
    default: 'General',
    index: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    index: true
  },
  tags: {
    type: [String],
    default: []
  },
  timeLimit: { type: Number, default: 30 },
  explanation: { type: String, default: '' },
  marks: { type: Number, default: 1, min: 1 },
  negativeMarks: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

questionBankSchema.index({ teacherId: 1, topic: 1, difficulty: 1 });

module.exports = mongoose.model('QuestionBank', questionBankSchema);
