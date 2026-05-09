const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const crypto = require('crypto');

// Helper to generate a 6-character uppercase alphanumeric code
const generateJoinCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

exports.createQuiz = async (req, res) => {
  try {
    const { title, leaderboardInterval, questions, negativeMarkingEnabled } = req.body;

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
        questions,
        negativeMarkingEnabled: negativeMarkingEnabled || false
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

exports.getFullQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    
    // Authorization check: Only the teacher who created it can get full details
    if (quiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.status(200).json({ success: true, quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.duplicateQuiz = async (req, res) => {
  try {
    const originalQuiz = await Quiz.findById(req.params.id);
    if (!originalQuiz) return res.status(404).json({ success: false, message: 'Original quiz not found' });

    // Authorization check
    if (originalQuiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let joinCode;
    let newQuiz;
    let attempts = 0;

    const quizData = originalQuiz.toObject();
    delete quizData._id;
    delete quizData.createdAt;
    delete quizData.updatedAt;
    
    quizData.title = `${quizData.title} (Copy)`;
    quizData.teacherId = req.user.userId;

    // Loop to handle joinCode collisions
    while (attempts < 5) {
      joinCode = generateJoinCode();
      quizData.joinCode = joinCode;
      
      newQuiz = new Quiz(quizData);

      try {
        await newQuiz.save();
        break; // Successfully saved
      } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.joinCode) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    if (attempts >= 5) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique join code' });
    }

    res.status(201).json({ success: true, message: 'Quiz duplicated successfully', quiz: newQuiz });
  } catch (err) {
    console.error('[QUIZ] Duplicate error:', err);
    res.status(500).json({ success: false, message: 'Failed to duplicate quiz' });
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

    if (quiz.isClosed) {
      console.log(`[QUIZ] Join failed: Quiz ${quiz._id} is permanently closed.`);
      return res.status(403).json({ success: false, message: 'This quiz has been permanently closed.' });
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
        timeLimit: q.timeLimit,
        marks: q.marks
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
      const isCorrect = studentAnswer && studentAnswer.selectedOptionIndex === q.correctOptionIndex;
      const marksAwarded = isCorrect ? (q.marks || 1) : (quiz.negativeMarkingEnabled ? -(q.negativeMarks || 0) : 0);

      if (isCorrect) {
        score += q.marks || 1;
      } else if (studentAnswer && quiz.negativeMarkingEnabled) {
        score -= q.negativeMarks || 0;
      }
      
      if (studentAnswer) {
        processedAnswers.push({
          questionId: q._id,
          selectedOptionIndex: studentAnswer.selectedOptionIndex,
          isCorrect,
          marksAwarded
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
      
      // TRUST THE BACKEND STORED VALUE (studentAnswer.isCorrect)
      // This is crucial because of shuffling!
      return {
        _id: q._id,
        text: q.text,
        options: q.options,
        timeLimit: q.timeLimit,
        explanation: q.explanation,
        correctOptionIndex: q.correctOptionIndex,
        userSelectedOptionIndex: studentAnswer ? studentAnswer.selectedOptionIndex : null,
        isCorrect: studentAnswer ? studentAnswer.isCorrect : false,
        marksAwarded: studentAnswer ? studentAnswer.marksAwarded : 0,
        questionMarks: q.marks,
        questionNegativeMarks: q.negativeMarks
      };
    });

    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    res.status(200).json({
      success: true,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      totalMarks,
      results
    });
  } catch (err) {
    console.error('[QUIZ] Results error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
};

exports.closeQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Only the creator can close it
    if (quiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (quiz.isClosed) {
      return res.status(400).json({ success: false, message: 'Quiz is already closed' });
    }

    quiz.isClosed = true;
    quiz.closedAt = new Date();
    await quiz.save();

    res.status(200).json({ success: true, message: 'Quiz permanently closed.' });
  } catch (err) {
    console.error('[QUIZ] Close error:', err);
    res.status(500).json({ success: false, message: 'Failed to close quiz' });
  }
};
