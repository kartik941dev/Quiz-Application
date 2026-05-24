const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

exports.getQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Verify ownership
    if (quiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attempts = await QuizAttempt.find({ quizId }).populate('studentId', 'name');

    if (attempts.length === 0) {
      return res.status(200).json({
        message: 'No attempts found for this quiz yet.',
        accuracyPerQuestion: [],
        avgTimePerQuestion: [],
        weakQuestions: [],
        scoreDistribution: [],
        avgQuizTime: 0,
        topPerformers: []
      });
    }

    const totalStudents = attempts.length;
    const totalQuestions = quiz.questions.length;

    // 1. Accuracy & Time per Question
    const accuracyPerQuestion = [];
    const avgTimePerQuestion = [];
    quiz.questions.forEach((q, index) => {
      let correctCount = 0;
      let totalTimeSpent = 0;

      attempts.forEach(attempt => {
        const studentAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString());
        if (studentAnswer) {
          if (studentAnswer.selectedOptionIndex === q.correctOptionIndex) {
            correctCount++;
          }
          totalTimeSpent += studentAnswer.timeTaken || 0;
        }
      });

      const accuracy = (correctCount / totalStudents) * 100;
      const avgTime = totalTimeSpent / totalStudents;

      accuracyPerQuestion.push({
        questionIndex: index + 1,
        questionText: q.text,
        accuracy: parseFloat(accuracy.toFixed(2))
      });

      avgTimePerQuestion.push({
        questionIndex: index + 1,
        avgTime: parseFloat(avgTime.toFixed(2))
      });
    });

    // 2. Score Distribution
    // Dynamically calculate ranges based on total questions
    // e.g., 0-25%, 26-50%, 51-75%, 76-100%
    const distribution = [
      { range: '0-25%', count: 0 },
      { range: '26-50%', count: 0 },
      { range: '51-75%', count: 0 },
      { range: '76-100%', count: 0 }
    ];

    attempts.forEach(attempt => {
      const percentage = (attempt.score / totalQuestions) * 100;
      if (percentage <= 25) distribution[0].count++;
      else if (percentage <= 50) distribution[1].count++;
      else if (percentage <= 75) distribution[2].count++;
      else distribution[3].count++;
    });

    // 3. Average Quiz Time
    let totalQuizDuration = 0;
    let completedCount = 0;

    attempts.forEach(attempt => {
      if (attempt.startedAt && attempt.completedAt) {
        totalQuizDuration += (new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000;
        completedCount++;
      }
    });

    const avgQuizTime = completedCount > 0 ? parseFloat((totalQuizDuration / completedCount).toFixed(2)) : 0;

    // 4. Top Performers
    const topPerformers = attempts
      .map(a => ({
        attemptId: a._id,
        name: a.studentId ? a.studentId.name : 'Unknown',
        score: a.score,
        percentage: parseFloat(((a.score / totalQuestions) * 100).toFixed(2))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      accuracyPerQuestion,
      avgTimePerQuestion,
      scoreDistribution: distribution,
      avgQuizTime,
      topPerformers
    });

  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
