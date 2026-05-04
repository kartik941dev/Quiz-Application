const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'student'], default: 'student' }
}, { timestamps: true });

// Hashing and comparing is now handled explicitly in authController.js

module.exports = mongoose.model('User', userSchema);
