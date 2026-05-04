const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const crypto = require('crypto');

// Helper to generate a 6-character uppercase alphanumeric code
const generateJoinCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

exports.createQuiz = async (req, res) => {
  try {
    const { title, leaderboardInterval, questions } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a title and at least one question' });
    }

    let joinCode;
    let quiz;
    let attempts = 0;
    
    // Loop to handle the virtually impossible chance of a joinCode collision
    while (attempts < 5) {
      joinCode = generateJoinCode();
      quiz = new Quiz({
        title,
        joinCode,
        teacherId: req.user.userId,
        leaderboardInterval: leaderboardInterval || 1,
        questions
      });

      try {
        await quiz.save();
        break; // Successfully saved
      } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.joinCode) {
          attempts++;
          continue; // Try generating a new code
        }
        throw err; // Rethrow other errors
      }
    }

    if (attempts >= 5) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique join code. Please try again.' });
    }

    res.status(201).json({ success: true, message: 'Quiz created successfully', quiz });
  } catch (err) {
    console.error('[QUIZ] Create error:', err);
    res.status(500).json({ success: false, message: `Failed to create quiz: ${err.message}` });
  }
};

exports.getTeacherQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacherId: req.user.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch quizzes' });
  }
};

// ==========================================
// STUDENT/ANTI-CHEATING ENDPOINTS
// ==========================================

exports.joinQuiz = async (req, res) => {
  try {
    const { joinCode } = req.body;
    
    if (!joinCode) {
      return res.status(400).json({ success: false, message: 'Please provide a join code' });
    }

    const cleanCode = joinCode.trim().toUpperCase();
    console.log(`[QUIZ] Attempting to join with code: "${cleanCode}"`);

    const quiz = await Quiz.findOne({ joinCode: cleanCode });
    if (!quiz) {
      console.log(`[QUIZ] Join failed: Quiz not found for code "${cleanCode}"`);
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    console.log(`[QUIZ] Join success: Found quiz "${quiz.title}" for code "${cleanCode}"`);

    // Try to create the attempt
    try {
      const attempt = new QuizAttempt({
        quizId: quiz._id,
        studentId: req.user.userId,
        answers: [],
        score: 0,
        totalQuestions: quiz.questions.length
      });
      await attempt.save();
    } catch (err) {
      // 11000 means they already have an attempt (compound index quizId + studentId)
      // This is fine, we just let them resume the quiz
      if (err.code !== 11000) {
        throw err;
      }
      // Note: If you want to rigidly block users who have already *completed* the quiz,
      // you could fetch the attempt and check if `attempt.answers.length === totalQuestions` 
      // but for now, we just let them navigate to the quiz view.
    }

    res.status(200).json({
      success: true,
      quizId: quiz._id,
      title: quiz.title
    });
  } catch (err) {
    console.error('[QUIZ] Join error:', err);
    res.status(500).json({ success: false, message: 'Server error joining quiz' });
  }
};

exports.getQuizForStudent = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // SECURITY: Create a sanitized copy of the quiz without correct options or explanations
    const sanitizedQuiz = {
      _id: quiz._id,
      title: quiz.title,
      leaderboardInterval: quiz.leaderboardInterval,
      questions: quiz.questions.map(q => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        timeLimit: q.timeLimit
      }))
    };

    res.status(200).json({ success: true, quiz: sanitizedQuiz });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching quiz' });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Expecting array: [{ questionId, selectedOptionIndex }]

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Invalid answers format' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Calculate score
    let score = 0;
    const processedAnswers = [];

    quiz.questions.forEach(q => {
      const studentAnswer = answers.find(a => a.questionId === q._id.toString());
      if (studentAnswer && studentAnswer.selectedOptionIndex === q.correctOptionIndex) {
        score += 1;
      }
      if (studentAnswer) {
        processedAnswers.push({
          questionId: q._id,
          selectedOptionIndex: studentAnswer.selectedOptionIndex
        });
      }
    });

    // Update Attempt (Use findOneAndUpdate because they joined previously)
    const attempt = await QuizAttempt.findOneAndUpdate(
      { quizId: id, studentId: req.user.userId },
      { $set: { answers: processedAnswers, score: score } },
      { new: true }
    );

    if (!attempt) {
       return res.status(404).json({ success: false, message: 'Quiz attempt not found. Did you join?' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Quiz submitted successfully', 
      attemptId: attempt._id 
    });
  } catch (err) {
    console.error('[QUIZ] Submit error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit quiz' });
  }
};

exports.getQuizResults = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch attempt
    const attempt = await QuizAttempt.findOne({ quizId: id, studentId: req.user.userId });
    if (!attempt) return res.status(404).json({ success: false, message: 'No attempt found for this quiz' });

    // Fetch full quiz details (including correct answers and explanations)
    const quiz = await Quiz.findById(id);

    // Merge data for frontend convenience
    const results = quiz.questions.map(q => {
      const studentAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString());
      return {
        _id: q._id,
        text: q.text,
        options: q.options,
        timeLimit: q.timeLimit,
        explanation: q.explanation,
        correctOptionIndex: q.correctOptionIndex,
        userSelectedOptionIndex: studentAnswer ? studentAnswer.selectedOptionIndex : null,
        isCorrect: studentAnswer ? studentAnswer.selectedOptionIndex === q.correctOptionIndex : false
      };
    });

    res.status(200).json({
      success: true,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      results
    });
  } catch (err) {
    console.error('[QUIZ] Results error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
};
