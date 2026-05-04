const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  questionIndex: { type: Number, required: true },
  doubtText: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  response: { type: String }
});

module.exports = mongoose.model('Doubt', doubtSchema);
