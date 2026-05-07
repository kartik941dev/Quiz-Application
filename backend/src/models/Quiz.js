const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [
      {
        validator: function(v) { return v.length >= 2 && v.length <= 6; },
        message: 'A question must have between 2 and 6 options.'
      }
    ]
  },
  correctOptionIndex: { 
    type: Number, 
    required: true,
    validate: [
      {
        validator: function(v) { return v >= 0 && v < this.options.length; },
        message: 'Correct option index must be within the bounds of the options array.'
      }
    ]
  },
  timeLimit: { type: Number, required: true, default: 30 },
  explanation: { type: String, default: '' },
  marks: { type: Number, default: 1, min: 1 },
  negativeMarks: { type: Number, default: 0, min: 0 }
}, { _id: true }); // Auto-generate _id for each question to easily reference them in live events

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  joinCode: { type: String, required: true, unique: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  leaderboardInterval: { type: Number, required: true, default: 1 },
  questions: {
    type: [questionSchema],
    validate: [
      {
        validator: function(v) { return v.length > 0; },
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
  negativeMarkingEnabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
