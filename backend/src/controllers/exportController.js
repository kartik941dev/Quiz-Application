const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Doubt = require('../models/Doubt');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Helper to aggregate data for export
const getExportData = async (quizId, userId) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error('Quiz not found');
  if (quiz.teacherId.toString() !== userId) throw new Error('Unauthorized');

  const attempts = await QuizAttempt.find({ quizId }).populate('studentId', 'name email');
  const doubts = await Doubt.find({ quizId }).populate('studentId', 'name');

  return { quiz, attempts, doubts };
};

exports.exportCSV = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { quiz, attempts, doubts } = await getExportData(quizId, req.user.userId);

    const data = attempts.map(attempt => {
      const studentDoubts = doubts.filter(d => d.studentId._id.toString() === attempt.studentId._id.toString());
      const duration = attempt.completedAt && attempt.startedAt 
        ? Math.round((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000) 
        : 0;

      return {
        Name: attempt.studentId.name,
        Email: attempt.studentId.email,
        Score: attempt.score,
        Total: attempt.totalQuestions,
        Accuracy: ((attempt.score / attempt.totalQuestions) * 100).toFixed(2) + '%',
        TimeSeconds: duration,
        TabSwitches: attempt.tabSwitchCount || 0,
        FastAnswers: attempt.fastAnswerCount || 0,
        Flagged: attempt.isFlagged ? 'YES' : 'NO',
        DoubtsCount: studentDoubts.length
      };
    });

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`Quiz_Report_${quiz.title.replace(/\s+/g, '_')}.csv`);
    return res.send(csv);

  } catch (err) {
    console.error('CSV Export Error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ message: err.message });
  }
};

exports.exportPDF = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { quiz, attempts, doubts } = await getExportData(quizId, req.user.userId);

    const doc = new PDFDocument({ margin: 50 });
    
    res.header('Content-Type', 'application/pdf');
    res.attachment(`Quiz_Report_${quiz.title.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // Title Section
    doc.fontSize(20).text('Quiz Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Quiz Title: ${quiz.title}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Total Questions: ${quiz.questions.length}`);
    doc.text(`Total Participants: ${attempts.length}`);
    doc.moveDown(2);

    // Student Results Table Header
    doc.fontSize(12).text('Student Performance Summary', { underline: true });
    doc.moveDown();
    
    attempts.forEach((attempt, index) => {
      const duration = attempt.completedAt && attempt.startedAt 
        ? Math.round((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000) 
        : 0;
      
      doc.fontSize(10).text(`${index + 1}. ${attempt.studentId.name} (${attempt.studentId.email})`);
      doc.text(`   Score: ${attempt.score}/${attempt.totalQuestions} | Time: ${duration}s | Flags: ${attempt.tabSwitchCount + attempt.fastAnswerCount}`);
      if (attempt.isFlagged) {
        doc.fillColor('red').text('   STATUS: FLAG SUSPICIOUS', { indent: 15 }).fillColor('black');
      }
      doc.moveDown(0.5);
    });

    // Doubts Section
    if (doubts.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Questions & Doubts Summary', { underline: true });
      doc.moveDown();

      doubts.forEach((d, index) => {
        doc.fontSize(10).text(`${index + 1}. [Q${d.questionIndex + 1}] ${d.studentId.name}: ${d.doubtText}`);
        if (d.response) {
          doc.fillColor('blue').text(`   Response: ${d.response}`, { indent: 15 }).fillColor('black');
        }
        doc.moveDown(0.5);
      });
    }

    // Suspicious Activity Section
    const flaggedAttempts = attempts.filter(a => a.isFlagged);
    if (flaggedAttempts.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Suspicious Activity Report', { underline: true });
      doc.moveDown();

      flaggedAttempts.forEach((a, index) => {
        doc.fontSize(10).text(`${index + 1}. ${a.studentId.name}:`);
        doc.text(`   Tab Switches: ${a.tabSwitchCount}`, { indent: 15 });
        doc.text(`   Fast Answers: ${a.fastAnswerCount}`, { indent: 15 });
        doc.moveDown(0.5);
      });
    }

    doc.end();

  } catch (err) {
    console.error('PDF Export Error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ message: err.message });
  }
};

const mailService = require('../services/mailService');

exports.exportEmailAll = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { quiz, attempts } = await getExportData(quizId, req.user.userId);

    if (attempts.length === 0) {
      return res.status(400).json({ success: false, message: 'No student attempts exist to report.' });
    }

    let successCount = 0;
    let failedCount = 0;
    let bypassedCount = 0;

    for (const attempt of attempts) {
      if (!attempt.studentId || !attempt.studentId.email) {
        failedCount++;
        continue;
      }

      const result = await mailService.sendReportEmail(
        quiz.title,
        attempt.studentId.name,
        attempt.studentId.email,
        attempt
      );

      if (result.success) {
        successCount++;
      } else if (result.bypassed) {
        bypassedCount++;
      } else {
        failedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk reports execution complete. Success: ${successCount}, Bypassed: ${bypassedCount}, Failed: ${failedCount}`
    });

  } catch (err) {
    console.error('Bulk Email Export Error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 500).json({ message: err.message });
  }
};

exports.exportEmailSingle = async (req, res) => {
  try {
    const { quizId, attemptId } = req.params;
    
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (quiz.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const attempt = await QuizAttempt.findById(attemptId).populate('studentId', 'name email');
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    if (!attempt.studentId || !attempt.studentId.email) {
      return res.status(400).json({ success: false, message: 'Attempt does not have valid student email information.' });
    }

    const result = await mailService.sendReportEmail(
      quiz.title,
      attempt.studentId.name,
      attempt.studentId.email,
      attempt
    );

    if (result.success) {
      return res.status(200).json({ success: true, message: 'Report email sent successfully.' });
    } else if (result.bypassed) {
      return res.status(200).json({ success: true, message: 'Mail delivery bypassed (disabled in server configuration).' });
    } else {
      return res.status(500).json({ success: false, message: `Failed to deliver email: ${result.error}` });
    }

  } catch (err) {
    console.error('Single Email Export Error:', err);
    res.status(500).json({ success: false, message: 'Server error sending report email' });
  }
};
