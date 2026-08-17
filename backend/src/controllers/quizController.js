const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const QuestionBank = require('../models/QuestionBank');
const crypto = require('crypto');

// Helper to generate a 6-character uppercase alphanumeric code
const generateJoinCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

exports.createQuiz = async (req, res) => {
  try {
    const { 
      title, 
      progressionMode = 'auto_timer',
      allowReattempt = false,
      leaderboardInterval, 
      showLeaderboard = true,
      questions, 
      negativeMarkingEnabled,
      shuffleQuestions = true,
      shuffleOptions = true,
      saveToQuestionBank = false
    } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a title and at least one question' });
    }

    let joinCode;
    let quiz;
    let attempts = 0;
    
    while (attempts < 5) {
      joinCode = generateJoinCode();
      quiz = new Quiz({
        title,
        joinCode,
        teacherId: req.user.userId,
        allowReattempt: Boolean(allowReattempt),
        progressionMode: progressionMode || 'auto_timer',
        showLeaderboard: Boolean(showLeaderboard),
        leaderboardInterval: Number(leaderboardInterval) || 1,
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        questions,
        negativeMarkingEnabled: negativeMarkingEnabled || false
      });

      try {
        await quiz.save();
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
      return res.status(500).json({ success: false, message: 'Failed to generate unique join code. Please try again.' });
    }

    // Optional: Save questions to the central Question Bank
    if (saveToQuestionBank && Array.isArray(questions)) {
      try {
        const bankDocs = questions.map(q => ({
          teacherId: req.user.userId,
          text: q.text,
          type: q.type || 'single_choice',
          options: q.options || [],
          correctOptionIndex: q.correctOptionIndex || 0,
          correctOptionIndices: q.correctOptionIndices || [],
          acceptedAnswers: q.acceptedAnswers || [],
          codeLanguage: q.codeLanguage || 'javascript',
          topic: q.topic || 'General',
          difficulty: q.difficulty || 'medium',
          timeLimit: q.timeLimit || 30,
          marks: q.marks || 1,
          negativeMarks: q.negativeMarks || 0,
          explanation: q.explanation || ''
        }));
        await QuestionBank.insertMany(bankDocs);
      } catch (bankErr) {
        console.error('[QUIZ] Question bank sync warning:', bankErr);
      }
    }

    res.status(201).json({ success: true, message: 'Quiz created successfully', quiz });
  } catch (err) {
    console.error('[QUIZ] Create error:', err);
    res.status(500).json({ success: false, message: `Failed to create quiz: ${err.message}` });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      progressionMode = 'auto_timer',
      allowReattempt = false,
      leaderboardInterval, 
      showLeaderboard = true,
      questions, 
      negativeMarkingEnabled,
      shuffleQuestions = true,
      shuffleOptions = true,
      saveToQuestionBank = false
    } = req.body;

    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    if (quiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this quiz' });
    }

    if (quiz.isClosed) {
      return res.status(400).json({ success: false, message: 'Closed quizzes cannot be edited.' });
    }

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a title and at least one question' });
    }

    quiz.title = title;
    quiz.progressionMode = progressionMode || 'auto_timer';
    quiz.allowReattempt = Boolean(allowReattempt);
    quiz.showLeaderboard = Boolean(showLeaderboard);
    quiz.leaderboardInterval = Number(leaderboardInterval) || 1;
    quiz.shuffleQuestions = Boolean(shuffleQuestions);
    quiz.shuffleOptions = Boolean(shuffleOptions);
    quiz.negativeMarkingEnabled = Boolean(negativeMarkingEnabled);
    quiz.questions = questions;

    await quiz.save();

    // Auto save questions to Question Bank if enabled
    if (saveToQuestionBank && Array.isArray(questions)) {
      try {
        const QuestionBank = require('../models/QuestionBank');
        for (const q of questions) {
          if (q.text && q.text.trim()) {
            await QuestionBank.findOneAndUpdate(
              { teacherId: req.user.userId, text: q.text.trim() },
              {
                text: q.text.trim(),
                type: q.type || 'single_choice',
                options: q.options || [],
                correctOptionIndex: q.correctOptionIndex || 0,
                correctOptionIndices: q.correctOptionIndices || [],
                acceptedAnswers: q.acceptedAnswers || [],
                codeLanguage: q.codeLanguage || 'javascript',
                topic: q.topic || 'General',
                difficulty: q.difficulty || 'medium',
                timeLimit: q.timeLimit || 30,
                explanation: q.explanation || '',
                marks: q.marks || 1,
                negativeMarks: q.negativeMarks || 0,
                teacherId: req.user.userId
              },
              { upsert: true, new: true }
            );
          }
        }
      } catch (bankErr) {
        console.error('[QUIZ] Question bank sync on edit error:', bankErr);
      }
    }

    res.status(200).json({ success: true, message: 'Quiz updated successfully', quiz });
  } catch (err) {
    console.error('[QUIZ] Update error:', err);
    res.status(500).json({ success: false, message: `Failed to update quiz: ${err.message}` });
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

    if (originalQuiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let joinCode;
    let newQuiz;
    let attempts = 0;

    while (attempts < 5) {
      joinCode = generateJoinCode();
      newQuiz = new Quiz({
        title: `${originalQuiz.title} (Copy)`,
        joinCode,
        teacherId: req.user.userId,
        allowReattempt: Boolean(originalQuiz.allowReattempt),
        progressionMode: originalQuiz.progressionMode || 'auto_timer',
        leaderboardInterval: originalQuiz.leaderboardInterval,
        showLeaderboard: originalQuiz.showLeaderboard,
        shuffleQuestions: originalQuiz.shuffleQuestions,
        shuffleOptions: originalQuiz.shuffleOptions,
        negativeMarkingEnabled: originalQuiz.negativeMarkingEnabled,
        questions: originalQuiz.questions.map(q => ({
          text: q.text,
          type: q.type || 'single_choice',
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          correctOptionIndices: q.correctOptionIndices || [],
          acceptedAnswers: q.acceptedAnswers || [],
          codeLanguage: q.codeLanguage || 'javascript',
          topic: q.topic || 'General',
          difficulty: q.difficulty || 'medium',
          timeLimit: q.timeLimit,
          explanation: q.explanation,
          marks: q.marks,
          negativeMarks: q.negativeMarks
        }))
      });

      try {
        await newQuiz.save();
        break;
      } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.joinCode) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    if (attempts >= 5) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique join code for duplicated quiz.' });
    }

    res.status(201).json({ success: true, message: 'Quiz duplicated successfully', quiz: newQuiz });
  } catch (err) {
    console.error('[QUIZ] Duplicate error:', err);
    res.status(500).json({ success: false, message: 'Failed to duplicate quiz' });
  }
};

exports.joinQuiz = async (req, res) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ success: false, message: 'Please provide a join code' });
    }

    const quiz = await Quiz.findOne({ joinCode: joinCode.trim().toUpperCase() });
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Invalid Quiz Code' });
    }

    if (quiz.isClosed) {
      return res.status(403).json({ success: false, message: 'This quiz has been closed by the teacher.' });
    }

    let attempt = await QuizAttempt.findOne({ quizId: quiz._id, studentId: req.user.userId });
    
    if (attempt && attempt.completedAt) {
      if (!quiz.allowReattempt) {
        return res.status(403).json({ success: false, message: 'You have already completed this quiz. Reattempts are disabled by the teacher.' });
      }

      // If reattempts are allowed: reset attempt for clean retry
      attempt.completedAt = null;
      attempt.score = 0;
      attempt.answers = [];
      attempt.startedAt = new Date();
      attempt.tabSwitchCount = 0;
      attempt.fastAnswerCount = 0;
      attempt.isFlagged = false;
      await attempt.save();
    }

    if (!attempt) {
      attempt = new QuizAttempt({
        quizId: quiz._id,
        studentId: req.user.userId,
        score: 0,
        totalQuestions: quiz.questions.length
      });
      await attempt.save();
    }

    res.status(200).json({
      success: true,
      message: 'Joined quiz successfully',
      quizId: quiz._id,
      title: quiz.title,
      progressionMode: quiz.progressionMode || 'auto_timer',
      allowReattempt: Boolean(quiz.allowReattempt),
      attemptId: attempt._id
    });
  } catch (err) {
    console.error('[QUIZ] Join error:', err);
    res.status(500).json({ success: false, message: 'Failed to join quiz' });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const sanitizedQuiz = {
      _id: quiz._id,
      title: quiz.title,
      joinCode: quiz.joinCode,
      allowReattempt: Boolean(quiz.allowReattempt),
      progressionMode: quiz.progressionMode || 'auto_timer',
      showLeaderboard: quiz.showLeaderboard !== false,
      leaderboardInterval: quiz.leaderboardInterval,
      questions: quiz.questions.map(q => ({
        _id: q._id,
        text: q.text,
        type: q.type || 'single_choice',
        options: q.options,
        codeLanguage: q.codeLanguage,
        timeLimit: q.timeLimit,
        marks: q.marks
      }))
    };

    res.status(200).json({ success: true, quiz: sanitizedQuiz });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching quiz' });
  }
};

exports.getQuizForStudent = exports.getQuizById;

exports.submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Invalid answers format' });
    }

    const attempt = await QuizAttempt.findOne({ quizId: id, studentId: req.user.userId });
    if (!attempt) {
       return res.status(404).json({ success: false, message: 'Quiz attempt not found. Did you join?' });
    }

    if (attempt.answers && attempt.answers.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already submitted answers for this quiz.' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    if (quiz.isClosed) {
      return res.status(403).json({ success: false, message: 'This quiz is permanently closed.' });
    }

    let score = 0;
    const processedAnswers = [];

    const normalizeText = (str) => (str || '').toString().trim().toLowerCase().replace(/^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?“']+$/g, '').replace(/\s+/g, ' ');

    quiz.questions.forEach(q => {
      const studentAnswer = answers.find(a => a.questionId === q._id.toString());
      if (studentAnswer) {
        let isCorrect = false;
        let evaluationStatus = 'auto_graded';
        const qType = q.type || 'single_choice';

        if (qType === 'single_choice' || qType === 'true_false') {
          isCorrect = studentAnswer.selectedOptionIndex === q.correctOptionIndex;
        } else if (qType === 'multiple_choice') {
          const sIndices = new Set(studentAnswer.selectedOptionIndices || []);
          const cIndices = new Set(q.correctOptionIndices || []);
          isCorrect = sIndices.size === cIndices.size && [...sIndices].every(x => cIndices.has(x));
        } else if (qType === 'fill_in_the_blank') {
          const cleanStudentText = normalizeText(studentAnswer.textResponse);
          const accepted = Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [];
          isCorrect = accepted.some(a => normalizeText(a) === cleanStudentText);
        } else if (qType === 'essay_code') {
          // Manual teacher review required
          isCorrect = false;
          evaluationStatus = 'pending_review';
        }

        const marksAwarded = qType === 'essay_code'
          ? 0 // Graded manually by teacher
          : (isCorrect ? (q.marks || 1) : (quiz.negativeMarkingEnabled ? -(q.negativeMarks || 0) : 0));

        if (isCorrect) {
          score += (q.marks || 1);
        } else if (quiz.negativeMarkingEnabled && qType !== 'essay_code') {
          score -= (q.negativeMarks || 0);
        }

        processedAnswers.push({
          questionId: q._id,
          selectedOptionIndex: studentAnswer.selectedOptionIndex,
          selectedOptionIndices: studentAnswer.selectedOptionIndices || [],
          textResponse: studentAnswer.textResponse || '',
          isCorrect,
          marksAwarded,
          evaluationStatus,
          teacherFeedback: ''
        });
      }
    });

    attempt.answers = processedAnswers;
    attempt.score = score;
    attempt.hasPendingReview = Boolean(processedAnswers.some(a => a.evaluationStatus === 'pending_review'));
    attempt.completedAt = new Date();
    await attempt.save();

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
    
    const attempt = await QuizAttempt.findOne({ quizId: id, studentId: req.user.userId });
    if (!attempt) return res.status(404).json({ success: false, message: 'No attempt found for this quiz' });

    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const results = quiz.questions.map(q => {
      const studentAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString());
      const isEssayCode = q.type === 'essay_code';
      const evalStatus = studentAnswer?.evaluationStatus || (isEssayCode ? 'pending_review' : 'auto_graded');

      return {
        questionId: q._id,
        text: q.text,
        type: q.type || 'single_choice',
        options: q.options || [],
        correctOptionIndex: q.correctOptionIndex,
        correctOptionIndices: q.correctOptionIndices || [],
        acceptedAnswers: q.acceptedAnswers || [],
        codeLanguage: q.codeLanguage,
        marks: q.marks || 1,
        explanation: q.explanation || '',
        selectedOptionIndex: studentAnswer ? studentAnswer.selectedOptionIndex : null,
        selectedOptionIndices: studentAnswer ? studentAnswer.selectedOptionIndices : [],
        textResponse: studentAnswer ? studentAnswer.textResponse : '',
        isCorrect: studentAnswer ? studentAnswer.isCorrect : false,
        marksAwarded: studentAnswer ? studentAnswer.marksAwarded : 0,
        evaluationStatus: evalStatus,
        teacherFeedback: studentAnswer?.teacherFeedback || ''
      };
    });

    const hasPendingReview = Boolean(attempt.hasPendingReview || results.some(r => r.evaluationStatus === 'pending_review'));

    res.status(200).json({
      success: true,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      totalMarks,
      hasPendingReview,
      allowReattempt: Boolean(quiz.allowReattempt),
      joinCode: quiz.joinCode,
      results
    });
  } catch (err) {
    console.error('[QUIZ] Results error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
};

exports.getQuizEvaluations = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (quiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const attempts = await QuizAttempt.find({ quizId: id })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    const codeQuestions = (quiz.questions || []).filter(q => q.type === 'essay_code');

    // Build evaluation submission list
    const evaluations = [];

    attempts.forEach(attempt => {
      codeQuestions.forEach(q => {
        const studentAns = (attempt.answers || []).find(a => a.questionId.toString() === q._id.toString());
        if (studentAns) {
          evaluations.push({
            attemptId: attempt._id,
            studentId: attempt.studentId ? attempt.studentId._id : 'unknown',
            studentName: attempt.studentId ? attempt.studentId.name : 'Unknown Student',
            studentEmail: attempt.studentId ? attempt.studentId.email : '',
            questionId: q._id,
            questionText: q.text,
            codeLanguage: q.codeLanguage || 'general',
            maxMarks: q.marks || 1,
            textResponse: studentAns.textResponse || '',
            marksAwarded: studentAns.marksAwarded || 0,
            evaluationStatus: studentAns.evaluationStatus || 'pending_review',
            teacherFeedback: studentAns.teacherFeedback || '',
            submittedAt: attempt.completedAt || attempt.createdAt
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      quizTitle: quiz.title,
      totalCodeQuestions: codeQuestions.length,
      evaluations
    });
  } catch (err) {
    console.error('[QUIZ] Evaluations error:', err);
    res.status(500).json({ success: false, message: 'Failed to load evaluations' });
  }
};

exports.gradeStudentAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, marksAwarded, teacherFeedback } = req.body;

    const attempt = await QuizAttempt.findById(attemptId).populate('quizId');
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const quiz = attempt.quizId;
    if (!quiz || quiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const question = quiz.questions.find(q => q._id.toString() === questionId.toString());
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    const maxMarks = question.marks || 1;
    const awarded = Math.min(Math.max(0, Number(marksAwarded) || 0), maxMarks);

    let answerFound = false;
    attempt.answers.forEach(a => {
      if (a.questionId.toString() === questionId.toString()) {
        a.marksAwarded = awarded;
        a.isCorrect = awarded > 0;
        a.evaluationStatus = 'graded';
        a.teacherFeedback = teacherFeedback || '';
        answerFound = true;
      }
    });

    if (!answerFound) {
      attempt.answers.push({
        questionId,
        textResponse: '',
        marksAwarded: awarded,
        isCorrect: awarded > 0,
        evaluationStatus: 'graded',
        teacherFeedback: teacherFeedback || ''
      });
    }

    // Recalculate total score from all answers
    attempt.score = attempt.answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
    attempt.hasPendingReview = Boolean(attempt.answers.some(a => a.evaluationStatus === 'pending_review'));
    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Grading saved successfully',
      attempt: {
        id: attempt._id,
        score: attempt.score,
        hasPendingReview: attempt.hasPendingReview
      }
    });
  } catch (err) {
    console.error('[QUIZ] Grading error:', err);
    res.status(500).json({ success: false, message: 'Failed to save grade' });
  }
};

exports.closeQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

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
