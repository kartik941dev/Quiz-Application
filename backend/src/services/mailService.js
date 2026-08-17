const nodemailer = require('nodemailer');
const QuizAttempt = require('../models/QuizAttempt');

/**
 * Creates the Nodemailer Transporter safely.
 * Returns null if mail service is disabled or credentials are missing.
 */
const createTransporter = () => {
  if (process.env.MAIL_ENABLED === 'false') {
    console.log('[MAIL] Mail service is explicitly disabled in .env (MAIL_ENABLED=false).');
    return null;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('[MAIL] Warning: SMTP configuration details are missing from .env. Mail delivery will be bypassed.');
    return null;
  }

  try {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465, // True for 465, false for other ports like 587/2525
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  } catch (err) {
    console.error('[MAIL] Failed to create transport:', err.message);
    return null;
  }
};

/**
 * Builds a beautiful, responsive HTML template for a single student attempt.
 */
const buildHtmlTemplate = (quizTitle, studentName, attempt, pastAttempts = []) => {
  const score = attempt.score;
  const totalQuestions = attempt.totalQuestions;
  const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : '0.0';
  const duration = attempt.completedAt && attempt.startedAt 
    ? Math.round((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000) 
    : 0;

  // Answers rows
  let answerRows = '';
  if (attempt.answers && attempt.answers.length > 0) {
    attempt.answers.forEach((ans, idx) => {
      const statusColor = ans.isCorrect ? '#2e7d32' : '#c62828';
      const statusText = ans.isCorrect ? '✅ Correct' : '❌ Incorrect';
      const pointsText = ans.marksAwarded >= 0 ? `+${ans.marksAwarded}` : `${ans.marksAwarded}`;
      
      answerRows += `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; font-weight: bold;">Q${idx + 1}</td>
          <td style="padding: 12px; color: ${statusColor}; font-weight: bold;">${statusText}</td>
          <td style="padding: 12px; text-align: center;">${pointsText}</td>
          <td style="padding: 12px; text-align: center; color: #555;">${ans.timeTaken?.toFixed(1) || '0.0'}s</td>
        </tr>
      `;
    });
  } else {
    answerRows = `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #777;">No answer detail captured.</td></tr>`;
  }

  // Past Attempts rows
  let historyRows = '';
  if (pastAttempts && pastAttempts.length > 0) {
    pastAttempts.forEach((past, idx) => {
      const pastPct = past.totalQuestions > 0 ? ((past.score / past.totalQuestions) * 100).toFixed(1) : '0.0';
      const pastDate = past.createdAt ? new Date(past.createdAt).toLocaleDateString() : 'Unknown';
      historyRows += `
        <tr style="border-bottom: 1px solid #eeeeee;">
          <td style="padding: 10px; color: #333;">${past.quizId?.title || 'Deleted Quiz'}</td>
          <td style="padding: 10px; text-align: center; font-weight: 500;">${past.score}/${past.totalQuestions}</td>
          <td style="padding: 10px; text-align: center; color: #646cff; font-weight: bold;">${pastPct}%</td>
          <td style="padding: 10px; text-align: center; color: #666; font-size: 0.9em;">${pastDate}</td>
        </tr>
      `;
    });
  } else {
    historyRows = `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #aaa; font-style: italic;">First quiz attempt! Keep going!</td></tr>`;
  }

  const cheatingWarning = attempt.isFlagged 
    ? `<div style="background-color: #ffebee; border: 1px solid #ffcdd2; color: #c62828; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-weight: bold; text-align: center;">
         ⚠️ Flagged Activity: Tab switching (${attempt.tabSwitchCount || 0}) or rapid submissions (${attempt.fastAnswerCount || 0}) detected during the quiz session.
       </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AssessIQ Performance Report</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7; margin: 0; padding: 20px; color: #1d1d1f;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e5e5ea;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 35px 25px; text-align: center; color: #ffffff;">
          <div style="font-size: 1.2rem; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; opacity: 0.9;">⚡ AssessIQ Platform</div>
          <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px;">Performance Report</h1>
        </div>

        <div style="padding: 30px 25px;">
          <p style="font-size: 1.1rem; margin-top: 0; margin-bottom: 20px;">Hello <strong>${studentName}</strong>,</p>
          <p style="color: #515154; line-height: 1.6; margin-bottom: 25px;">
            Here is your official performance report for the quiz <strong>"${quizTitle}"</strong>.
          </p>

          ${cheatingWarning}

          <!-- Score Card Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; text-align: center;">
            <div style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; border: 1px solid #e5e5ea;">
              <div style="font-size: 0.85rem; color: #86868b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Score</div>
              <div style="font-size: 1.6rem; font-weight: bold; color: #646cff;">${score} / ${totalQuestions}</div>
            </div>
            <div style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; border: 1px solid #e5e5ea;">
              <div style="font-size: 0.85rem; color: #86868b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Accuracy</div>
              <div style="font-size: 1.6rem; font-weight: bold; color: #2e7d32;">${percentage}%</div>
            </div>
          </div>

          <div style="background-color: #f9f9fb; padding: 15px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #eeeeee;">
            <div style="font-size: 0.9rem; color: #666; text-align: center;">
              ⏱️ Total Duration: <strong>${duration} seconds</strong>
            </div>
          </div>

          <!-- Section: Detailed Question Palette -->
          <h3 style="color: #1d1d1f; border-bottom: 2px solid #646cff; padding-bottom: 8px; margin-bottom: 15px;">📊 Question Breakdown</h3>
          <div style="overflow-x: auto; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f5f5f7; border-bottom: 2px solid #e5e5ea;">
                  <th style="padding: 10px; font-size: 0.9em; color: #666;">No.</th>
                  <th style="padding: 10px; font-size: 0.9em; color: #666;">Status</th>
                  <th style="padding: 10px; font-size: 0.9em; color: #666; text-align: center;">Points</th>
                  <th style="padding: 10px; font-size: 0.9em; color: #666; text-align: center;">Time</th>
                </tr>
              </thead>
              <tbody>
                ${answerRows}
              </tbody>
            </table>
          </div>

          <!-- Section: Historical Trends -->
          <h3 style="color: #1d1d1f; border-bottom: 2px solid #646cff; padding-bottom: 8px; margin-bottom: 15px;">📈 Your Progress History</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f5f5f7; border-bottom: 2px solid #e5e5ea;">
                  <th style="padding: 8px; font-size: 0.9em; color: #666;">Quiz Title</th>
                  <th style="padding: 8px; font-size: 0.9em; color: #666; text-align: center;">Score</th>
                  <th style="padding: 8px; font-size: 0.9em; color: #666; text-align: center;">Accuracy</th>
                  <th style="padding: 8px; font-size: 0.9em; color: #666; text-align: center;">Date</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f5f5f7; border-top: 1px solid #e5e5ea; padding: 20px; text-align: center; font-size: 0.8rem; color: #86868b;">
          This is an automated performance report from your AssessIQ account.<br>
          &copy; ${new Date().getFullYear()} AssessIQ Platform. All Rights Reserved.
        </div>

      </div>
    </body>
    </html>
  `;
};

/**
 * Sends a single report to a student email.
 * Gracefully wraps email execution to prevent any app crashes.
 */
exports.sendReportEmail = async (quizTitle, studentName, studentEmail, attempt) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log(`[MAIL] Bypassing mail sending to ${studentEmail} due to missing config or disabled state.`);
    return { success: false, bypassed: true, message: 'Mail configuration missing or explicitly disabled.' };
  }

  try {
    // Fetch student's past attempts to display in historical section
    const pastAttempts = await QuizAttempt.find({ 
      studentId: attempt.studentId,
      _id: { $ne: attempt._id } // exclude current attempt
    })
    .populate('quizId', 'title')
    .sort({ createdAt: -1 })
    .limit(5); // Show last 5 attempts

    const htmlContent = buildHtmlTemplate(quizTitle, studentName, attempt, pastAttempts);

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@assessiq.com',
      to: studentEmail,
      subject: `🎯 Quiz Performance Report: ${quizTitle}`,
      html: htmlContent
    };

    console.log(`[MAIL] Preparing to send report to: ${studentEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAIL] Email sent successfully to ${studentEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MAIL] Error sending report email to ${studentEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};
