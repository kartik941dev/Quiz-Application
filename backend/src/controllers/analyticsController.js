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
    const totalQuizMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    // 1. Accuracy & Time per Question (Evaluating all 5 question formats)
    const accuracyPerQuestion = [];
    const avgTimePerQuestion = [];

    quiz.questions.forEach((q, index) => {
      let correctCount = 0;
      let totalTimeSpent = 0;
      let answeredCount = 0;

      attempts.forEach(attempt => {
        const studentAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString());
        if (studentAnswer) {
          answeredCount++;
          
          let isCorrect = Boolean(studentAnswer.isCorrect);

          if (!isCorrect) {
            if (q.type === 'single_choice' || q.type === 'true_false') {
              if (studentAnswer.selectedOptionIndex === q.correctOptionIndex) isCorrect = true;
            } else if (q.type === 'multiple_choice') {
              const studentOpts = Array.isArray(studentAnswer.selectedOptionIndices) ? studentAnswer.selectedOptionIndices : [];
              const correctOpts = Array.isArray(q.correctOptionIndices) ? q.correctOptionIndices : [];
              if (studentOpts.length === correctOpts.length && studentOpts.every(idx => correctOpts.includes(idx))) {
                isCorrect = true;
              }
            } else if (q.type === 'fill_in_the_blank' && studentAnswer.textResponse && Array.isArray(q.acceptedAnswers)) {
              if (q.acceptedAnswers.some(ans => ans.trim().toLowerCase() === studentAnswer.textResponse.trim().toLowerCase())) {
                isCorrect = true;
              }
            } else if (studentAnswer.marksAwarded > 0) {
              isCorrect = true;
            }
          }

          if (isCorrect) correctCount++;
          totalTimeSpent += studentAnswer.timeTaken || 0;
        }
      });

      const accuracy = totalStudents > 0 ? (correctCount / totalStudents) * 100 : 0;
      const avgTime = totalStudents > 0 ? totalTimeSpent / totalStudents : 0;

      accuracyPerQuestion.push({
        questionIndex: `Q${index + 1}`,
        questionNumber: index + 1,
        questionText: q.text,
        type: q.type || 'single_choice',
        correctCount,
        totalAttempts: totalStudents,
        accuracy: parseFloat(accuracy.toFixed(1))
      });

      avgTimePerQuestion.push({
        questionIndex: `Q${index + 1}`,
        questionNumber: index + 1,
        avgTime: parseFloat(avgTime.toFixed(1))
      });
    });

    // 2. Score Distribution & Overall Accuracy
    const distribution = [
      { range: '0-25%', count: 0 },
      { range: '26-50%', count: 0 },
      { range: '51-75%', count: 0 },
      { range: '76-100%', count: 0 }
    ];

    let overallTotalPercentage = 0;
    let bestScorePercentage = 0;

    attempts.forEach(attempt => {
      const studentScore = typeof attempt.score === 'number' ? Math.max(0, attempt.score) : 0;
      const percentage = totalQuizMarks > 0 ? (studentScore / totalQuizMarks) * 100 : 0;
      
      overallTotalPercentage += percentage;
      if (percentage > bestScorePercentage) {
        bestScorePercentage = percentage;
      }

      if (percentage <= 25) distribution[0].count++;
      else if (percentage <= 50) distribution[1].count++;
      else if (percentage <= 75) distribution[2].count++;
      else distribution[3].count++;
    });

    const overallAvgAccuracy = totalStudents > 0 ? parseFloat((overallTotalPercentage / totalStudents).toFixed(1)) : 0;

    // 3. Average Quiz Time
    let totalQuizDuration = 0;
    let completedCount = 0;

    attempts.forEach(attempt => {
      if (attempt.startedAt && attempt.completedAt) {
        totalQuizDuration += (new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000;
        completedCount++;
      }
    });

    const avgQuizTime = completedCount > 0 ? parseFloat((totalQuizDuration / completedCount).toFixed(1)) : 0;

    // 4. Top Performers
    const topPerformers = attempts
      .map(a => {
        const studentScore = typeof a.score === 'number' ? Math.max(0, a.score) : 0;
        const percentage = totalQuizMarks > 0 ? (studentScore / totalQuizMarks) * 100 : 0;
        return {
          attemptId: a._id,
          name: a.studentId ? a.studentId.name : 'Unknown',
          score: studentScore,
          totalMarks: totalQuizMarks,
          percentage: parseFloat(percentage.toFixed(1))
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      quizTitle: quiz.title,
      totalParticipants: totalStudents,
      totalMarks: totalQuizMarks,
      overallAvgAccuracy,
      bestScorePercentage: parseFloat(bestScorePercentage.toFixed(1)),
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
