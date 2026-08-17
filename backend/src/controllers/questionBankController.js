const QuestionBank = require('../models/QuestionBank');
const mongoose = require('mongoose');

// Create single question in Question Bank
exports.createQuestion = async (req, res) => {
  try {
    const { 
      text, 
      type = 'single_choice', 
      options = [], 
      correctOptionIndex = 0, 
      correctOptionIndices = [], 
      acceptedAnswers = [], 
      codeLanguage = 'javascript', 
      topic = 'General', 
      difficulty = 'medium', 
      tags = [], 
      timeLimit = 30, 
      explanation = '', 
      marks = 1, 
      negativeMarks = 0 
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required.' });
    }

    const question = new QuestionBank({
      teacherId: req.user.userId,
      text: text.trim(),
      type,
      options,
      correctOptionIndex,
      correctOptionIndices,
      acceptedAnswers: Array.isArray(acceptedAnswers) ? acceptedAnswers.map(a => String(a).trim()) : [],
      codeLanguage,
      topic: topic ? topic.trim() : 'General',
      difficulty,
      tags: Array.isArray(tags) ? tags : [],
      timeLimit: Number(timeLimit) || 30,
      explanation,
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0
    });

    await question.save();

    res.status(201).json({
      success: true,
      message: 'Question added to Question Bank',
      question
    });
  } catch (err) {
    console.error('[QUESTION_BANK] Create error:', err);
    res.status(500).json({ success: false, message: 'Failed to create question in bank.' });
  }
};

// Bulk add questions to Question Bank
exports.bulkCreateQuestions = async (req, res) => {
  try {
    const { questions = [], defaultTopic = 'General' } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Questions array is required.' });
    }

    const docs = questions.map(q => ({
      teacherId: req.user.userId,
      text: q.text?.trim() || 'Untitled Question',
      type: q.type || 'single_choice',
      options: q.options || [],
      correctOptionIndex: Number(q.correctOptionIndex) || 0,
      correctOptionIndices: Array.isArray(q.correctOptionIndices) ? q.correctOptionIndices : [],
      acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [],
      codeLanguage: q.codeLanguage || 'javascript',
      topic: q.topic?.trim() || defaultTopic || 'General',
      difficulty: q.difficulty || 'medium',
      tags: Array.isArray(q.tags) ? q.tags : [],
      timeLimit: Number(q.timeLimit) || 30,
      explanation: q.explanation || '',
      marks: Number(q.marks) || 1,
      negativeMarks: Number(q.negativeMarks) || 0
    }));

    const inserted = await QuestionBank.insertMany(docs);

    res.status(201).json({
      success: true,
      message: `Successfully saved ${inserted.length} questions to Question Bank.`,
      count: inserted.length
    });
  } catch (err) {
    console.error('[QUESTION_BANK] Bulk create error:', err);
    res.status(500).json({ success: false, message: 'Failed to bulk import questions.' });
  }
};

// Query / Filter Question Bank
exports.getQuestions = async (req, res) => {
  try {
    const { topic, difficulty, type, search } = req.query;
    const filter = { teacherId: req.user.userId };

    if (topic && topic !== 'all') {
      filter.topic = { $regex: new RegExp(`^${topic}$`, 'i') };
    }

    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty;
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (search && search.trim()) {
      filter.$or = [
        { text: { $regex: search.trim(), $options: 'i' } },
        { topic: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } }
      ];
    }

    const questions = await QuestionBank.find(filter).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: questions.length,
      questions
    });
  } catch (err) {
    console.error('[QUESTION_BANK] Get error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch question bank.' });
  }
};

// Get list of unique topics & stats
exports.getTopics = async (req, res) => {
  try {
    const topics = await QuestionBank.aggregate([
      { $match: { teacherId: new mongoose.Types.ObjectId(req.user.userId) } },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      topics: topics.map(t => ({ name: t._id || 'General', count: t.count }))
    });
  } catch (err) {
    console.error('[QUESTION_BANK] Topics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch topics.' });
  }
};

// Delete a question from the bank
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await QuestionBank.findOneAndDelete({
      _id: id,
      teacherId: req.user.userId
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Question not found in bank.' });
    }

    res.status(200).json({
      success: true,
      message: 'Question removed from Question Bank.'
    });
  } catch (err) {
    console.error('[QUESTION_BANK] Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
};
