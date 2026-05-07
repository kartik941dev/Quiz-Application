const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

exports.getStudentDashboardStats = async (req, res) => {
  try {
    const studentId = req.user.userId;

    // 1. Fetch all attempts by this student
    const attempts = await QuizAttempt.find({ studentId })
      .populate('quizId', 'title')
      .sort({ createdAt: -1 });

    // 2. Calculate Overall Performance
    const totalQuizzes = attempts.length;
    let totalPercentage = 0;
    let bestScore = 0;
    
    attempts.forEach(a => {
      if (a.totalQuestions > 0) {
        const percentage = (a.score / a.totalQuestions) * 100;
        totalPercentage += percentage;
        if (percentage > bestScore) bestScore = percentage;
      }
    });

    const avgScore = totalQuizzes > 0 ? parseFloat((totalPercentage / totalQuizzes).toFixed(1)) : 0;

    // 3. Determine Badges (Gamification)
    const badges = [];
    if (totalQuizzes >= 1) badges.push({ id: 'first-quiz', title: 'First Quiz', icon: '🎯', description: 'Completed your first quiz!' });
    if (attempts.some(a => a.score === a.totalQuestions && a.totalQuestions > 0)) {
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

    res.status(200).json({
      success: true,
      stats: {
        totalQuizzes,
        avgScore,
        bestScore: parseFloat(bestScore.toFixed(1)),
        attempts: attempts.map(a => ({
          id: a._id,
          quizTitle: a.quizId ? a.quizId.title : 'Deleted Quiz',
          score: a.score,
          totalQuestions: a.totalQuestions,
          date: a.createdAt,
          percentage: a.totalQuestions > 0 ? ((a.score / a.totalQuestions) * 100).toFixed(1) : "0.0"
        })),
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
      .populate('quizId', 'title')
      .sort({ createdAt: -1 });

    const formattedAttempts = attempts.map(a => ({
      quizTitle: a.quizId ? a.quizId.title : 'Deleted Quiz',
      score: a.score,
      total: a.totalQuestions,
      accuracy: a.totalQuestions > 0 ? parseFloat(((a.score / a.totalQuestions) * 100).toFixed(1)) : 0,
      createdAt: a.createdAt
    }));

    res.status(200).json({ success: true, attempts: formattedAttempts });
  } catch (err) {
    console.error('[STUDENT] Attempts Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attempts' });
  }
};
