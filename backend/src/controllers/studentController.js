const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

exports.getStudentDashboardStats = async (req, res) => {
  try {
    const studentId = req.user.userId;

    // 1. Fetch all completed/active attempts by this student
    const attempts = await QuizAttempt.find({ studentId })
      .populate('quizId', 'title questions')
      .sort({ createdAt: -1 });

    // 2. Calculate Overall Performance & Accuracy
    let totalPercentage = 0;
    let bestScore = 0;
    let evaluatedAttemptsCount = 0;

    const formattedAttempts = attempts.map(a => {
      const quiz = a.quizId;
      const totalPossibleMarks = quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0
        ? quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0)
        : (a.totalQuestions || 1);

      const studentScore = typeof a.score === 'number' ? Math.max(0, a.score) : 0;
      const pct = totalPossibleMarks > 0 ? parseFloat(((studentScore / totalPossibleMarks) * 100).toFixed(1)) : 0;

      // Only count attempts with answers or marked completed in average
      if (a.completedAt || (a.answers && a.answers.length > 0)) {
        totalPercentage += pct;
        if (pct > bestScore) bestScore = pct;
        evaluatedAttemptsCount++;
      }

      return {
        id: a._id,
        quizTitle: quiz ? quiz.title : 'Deleted Quiz',
        score: studentScore,
        totalQuestions: a.totalQuestions || (quiz ? quiz.questions?.length : 0) || 1,
        totalMarks: totalPossibleMarks,
        date: a.createdAt,
        percentage: pct.toFixed(1)
      };
    });

    const totalQuizzes = evaluatedAttemptsCount > 0 ? evaluatedAttemptsCount : attempts.length;
    const avgScore = evaluatedAttemptsCount > 0 ? parseFloat((totalPercentage / evaluatedAttemptsCount).toFixed(1)) : 0;

    // 3. Determine Badges (Gamification)
    const badges = [];
    if (totalQuizzes >= 1) badges.push({ id: 'first-quiz', title: 'First Quiz', icon: '🎯', description: 'Completed your first quiz!' });
    if (attempts.some(a => a.score > 0 && a.score >= a.totalQuestions)) {
      badges.push({ id: 'top-scorer', title: 'Top Scorer', icon: '🏆', description: 'Got a perfect score!' });
    }
    if (attempts.some(a => a.fastAnswerCount > 0)) {
      badges.push({ id: 'fast-answer', title: 'Quick Thinker', icon: '⚡', description: 'Answered correctly in under 2 seconds!' });
    }
    if (totalQuizzes >= 5) badges.push({ id: 'consistent', title: 'Consistent', icon: '🔥', description: 'Completed 5+ quizzes!' });

    // 4. Global Leaderboard (Top 10 Students by total score)
    const leaderboard = await QuizAttempt.aggregate([
      { $group: { _id: '$studentId', totalScore: { $sum: '$score' }, quizzesCount: { $sum: 1 } } },
      { $sort: { totalScore: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $project: {
          _id: 1,
          name: '$studentInfo.name',
          totalScore: 1,
          quizzesCount: 1
        }
      }
    ]);

    // Accuracy History for Charting (Chronological order)
    const accuracyHistory = [...formattedAttempts]
      .reverse()
      .slice(-10)
      .map((a, i) => ({
        attemptNumber: `#${i + 1}`,
        quizTitle: a.quizTitle.length > 15 ? a.quizTitle.substring(0, 15) + '...' : a.quizTitle,
        accuracy: parseFloat(a.percentage)
      }));

    res.status(200).json({
      success: true,
      stats: {
        totalQuizzes,
        avgScore,
        bestScore: parseFloat(bestScore.toFixed(1)),
        attempts: formattedAttempts,
        accuracyHistory,
        badges,
        leaderboard
      }
    });

  } catch (err) {
    console.error('[STUDENT] Stats Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
};

exports.getMyAttempts = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const attempts = await QuizAttempt.find({ studentId })
      .populate('quizId', 'title questions')
      .sort({ createdAt: -1 });

    const formattedAttempts = attempts.map(a => {
      const quiz = a.quizId;
      const totalPossibleMarks = quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0
        ? quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0)
        : (a.totalQuestions || 1);

      const studentScore = typeof a.score === 'number' ? Math.max(0, a.score) : 0;
      const pct = totalPossibleMarks > 0 ? parseFloat(((studentScore / totalPossibleMarks) * 100).toFixed(1)) : 0;

      return {
        quizTitle: quiz ? quiz.title : 'Deleted Quiz',
        score: studentScore,
        total: totalPossibleMarks,
        accuracy: pct,
        createdAt: a.createdAt
      };
    });

    res.status(200).json({ success: true, attempts: formattedAttempts });
  } catch (err) {
    console.error('[STUDENT] Attempts Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attempts' });
  }
};
