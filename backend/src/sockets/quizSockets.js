const jwt = require('jsonwebtoken');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// In-Memory State Manager
const activeQuizzes = {
  /*
  quizId: {
    quizDoc: <MongoDB Quiz Document>,
    currentQuestionIndex: -1,
    timerId: null,
    studentScores: { studentId: { score, lastAnswerTime } },
    studentNames: { studentId: name },
    submittedFlags: { 'studentId_questionIndex': true },
    participants: { userId: socketId }, // Mapping for tracking & kicking
    timeLeft: number
  }
  */
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const activeSocketUsers = {}; // userId -> socketId

module.exports = (io) => {
  
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // { userId, role, name, ... }
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  const handleEndQuiz = async (quizId, io) => {
    const state = activeQuizzes[quizId];
    if (!state) return;

    if (state.timerId) clearInterval(state.timerId);

    const totalQuestions = state.quizDoc.questions.length;
    const now = Date.now();
    for (const studentId in state.studentScores) {
       const scoreObj = state.studentScores[studentId];
       const score = scoreObj ? scoreObj.score : 0;
       const answers = state.studentAnswers[studentId] || [];
       const startedAt = state.studentStartTime[studentId] || now;
       const suspicious = state.suspiciousUsers[studentId] || { fastAnswerCount: 0, tabSwitchCount: 0, flagged: false };

       try {
         await QuizAttempt.findOneAndUpdate(
           { quizId, studentId },
           { 
             $set: { 
               score, 
               totalQuestions, 
               answers,
               startedAt: new Date(startedAt),
               completedAt: new Date(now),
               tabSwitchCount: suspicious.tabSwitchCount,
               fastAnswerCount: suspicious.fastAnswerCount,
               isFlagged: suspicious.flagged
             } 
           }, 
           { upsert: true, new: true }
         );
       } catch (err) {
         console.error(`[SOCKET] Failed to save attempt for ${studentId}:`, err);
       }
    }

    io.to(quizId).emit('quiz-ended');
    delete activeQuizzes[quizId];
    console.log(`[SOCKET] Memory cleaned up for ${quizId} (Auto/Manual End)`);
  };

  const emitNextQuestion = (quizId, io) => {
    const state = activeQuizzes[quizId];
    if (!state) return;

    state.currentQuestionIndex++;
    
    if (state.currentQuestionIndex >= state.quizDoc.questions.length) {
       handleEndQuiz(quizId, io);
       return;
    }

    const q = state.quizDoc.questions[state.currentQuestionIndex];
    const qNum = state.currentQuestionIndex;
    const showLeaderboard = qNum > 0 && qNum % state.quizDoc.leaderboardInterval === 0;

    if (showLeaderboard) {
       const topScores = Object.keys(state.studentScores)
          .map(id => ({ 
            name: state.studentNames[id], 
            score: state.studentScores[id].score || 0,
            lastAnswerTime: state.studentScores[id].lastAnswerTime || 0
          }))
          .sort((a, b) => {
             if (b.score !== a.score) return b.score - a.score;
             return a.lastAnswerTime - b.lastAnswerTime;
          })
          .slice(0, 5);
       
       io.to(quizId).emit('leaderboard-update', { leaderboard: topScores });
    }

    const delayMs = showLeaderboard ? 5000 : 0;
    
    setTimeout(() => {
      if (!activeQuizzes[quizId]) return; // Ensure state still exists
      state.questionStartTime = Date.now();
      io.to(quizId).emit('question', {
        questionIndex: state.currentQuestionIndex,
        question: { text: q.text, options: q.options, timeLimit: q.timeLimit },
        timeLeft: q.timeLimit
      });

      let timeLeft = q.timeLimit;
      if (state.timerId) clearInterval(state.timerId);
      
      state.timeLeft = timeLeft;
      io.to(quizId).emit('timer', { timeLeft });
      
      state.timerId = setInterval(() => {
        timeLeft--;
        state.timeLeft = timeLeft;
        
        if (timeLeft <= 0) {
          clearInterval(state.timerId);
          io.to(quizId).emit('time-up');
          // AUTO PROGRESSION
          setTimeout(() => emitNextQuestion(quizId, io), 2000);
        } else {
          io.to(quizId).emit('timer', { timeLeft });
        }
      }, 1000);
    }, delayMs);
  };

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    console.log(`[SOCKET] User connected: ${userId} (${socket.user.role})`);

    // Prevent Multiple Sessions Logic
    if (activeSocketUsers[userId]) {
      console.log(`[SOCKET] Disconnecting old session for user: ${userId}`);
      const oldSocket = io.sockets.sockets.get(activeSocketUsers[userId]);
      if (oldSocket) {
        oldSocket.emit('force-disconnect', { message: 'Multiple login sessions detected. This session was disconnected.' });
        oldSocket.disconnect();
      }
    }
    activeSocketUsers[userId] = socket.id;

    // ==========================================
    // JOIN ROOM (Teacher & Student)
    // ==========================================
    socket.on('join-quiz', async ({ quizId }) => {
      socket.join(quizId);
      console.log(`[SOCKET] User ${socket.user.userId} joined room ${quizId}`);
      
      let state = activeQuizzes[quizId];
      
      // If state doesn't exist, and teacher joins, initialize it
      if (!state && socket.user.role === 'teacher') {
        try {
          const quiz = await Quiz.findById(quizId);
          if (quiz && quiz.teacherId.toString() === socket.user.userId) {
            // SHUFFLING LOGIC
            const shuffledQuestions = shuffleArray([...quiz.questions]).map(q => {
              const options = [...q.options];
              const correctOptionText = options[q.correctOptionIndex];
              shuffleArray(options);
              const newCorrectIndex = options.indexOf(correctOptionText);
              return {
                ...q.toObject(),
                options,
                correctOptionIndex: newCorrectIndex
              };
            });

            activeQuizzes[quizId] = {
              quizDoc: { ...quiz.toObject(), questions: shuffledQuestions },
              currentQuestionIndex: -1,
              timerId: null,
              studentScores: {},
              studentNames: {},
              submittedFlags: {},
              participants: {},
              teacherSocketId: socket.id,
              cheatingLogs: [],
              cheatingCount: {},
              suspiciousUsers: {},
              questionStartTime: null,
              disconnectedUsers: {},
              studentAnswers: {}, // userId -> [{ questionId, selectedOptionIndex, timeTaken }]
              studentStartTime: {} // userId -> timestamp
            };
            state = activeQuizzes[quizId];
            console.log(`[SOCKET] Quiz state initialized with SHUFFLING for ${quizId}`);
          }
        } catch (err) {
          console.error('[SOCKET] Error initializing quiz:', err);
        }
      }

      if (state) {
        // If teacher joins an existing quiz, update their socketId
        if (socket.user.role === 'teacher') {
          state.teacherSocketId = socket.id;
        }

        // REJOIN LOGIC
        if (socket.user.role === 'student') {
          const userId = socket.user.userId;
          const disconnectInfo = state.disconnectedUsers[userId];

          if (disconnectInfo) {
            const now = Date.now();
            const timeSinceDisconnect = (now - disconnectInfo.lastDisconnectTime) / 1000;
            
            // Limits: 60 seconds and 2 rejoin attempts
            if (timeSinceDisconnect > 60) {
              socket.emit('rejoin-denied', { message: "Rejoin time expired (limit 60s)." });
              return;
            }
            if (disconnectInfo.rejoinCount >= 2) {
              socket.emit('rejoin-denied', { message: "Maximum rejoin attempts exceeded." });
              return;
            }

            disconnectInfo.rejoinCount++;
            console.log(`[SOCKET] User ${userId} rejoining (Attempt ${disconnectInfo.rejoinCount})`);
          }

          state.participants[userId] = socket.id;
          
          if (!state.studentScores[userId]) {
            state.studentScores[userId] = { score: 0, lastAnswerTime: Date.now() };
            state.studentNames[userId] = socket.user.name || `Student ${userId.slice(-4)}`; 
            state.cheatingCount[userId] = 0;
            state.suspiciousUsers[userId] = { fastAnswerCount: 0, tabSwitchCount: 0, flagged: false };
            state.studentAnswers[userId] = [];
            state.studentStartTime[userId] = Date.now();
          }

          // RESTORE STATE for rejoining student
          if (state.currentQuestionIndex >= 0) {
            const q = state.quizDoc.questions[state.currentQuestionIndex];
            socket.emit('restore-state', {
              questionIndex: state.currentQuestionIndex,
              question: { text: q.text, options: q.options, timeLimit: q.timeLimit },
              timeLeft: state.timeLeft || 0,
              score: state.studentScores[userId].score
            });
          }
          
          // Notify teacher that a student joined/rejoined
          io.to(quizId).emit('participant-update', {
            participants: Object.keys(state.participants).map(id => ({
              userId: id,
              name: state.studentNames[id],
              flagged: state.suspiciousUsers[id]?.flagged,
              stats: state.suspiciousUsers[id]
            }))
          });
        }
      }
    });

    // ==========================================
    // TEACHER CONTROLS
    // ==========================================
    socket.on('start-quiz', async ({ quizId }) => {
      if (socket.user.role !== 'teacher') return;
      
      let state = activeQuizzes[quizId];
      if (!state) return;

      state.currentQuestionIndex = 0;
      state.questionStartTime = Date.now();
      const q = state.quizDoc.questions[0];
      
      io.to(quizId).emit('question', {
        questionIndex: 0,
        question: { text: q.text, options: q.options, timeLimit: q.timeLimit },
        timeLeft: q.timeLimit
      });

      // Start timer for the first question
      let timeLeft = q.timeLimit;
      state.timeLeft = timeLeft;
      io.to(quizId).emit('timer', { timeLeft });

      if (state.timerId) clearInterval(state.timerId);
      state.timerId = setInterval(() => {
        timeLeft--;
        state.timeLeft = timeLeft;
        if (timeLeft <= 0) {
          clearInterval(state.timerId);
          io.to(quizId).emit('time-up');
          // AUTO PROGRESSION
          setTimeout(() => emitNextQuestion(quizId, io), 2000);
        } else {
          io.to(quizId).emit('timer', { timeLeft });
        }
      }, 1000);
      
      console.log(`[SOCKET] Quiz ${quizId} started. Question 0 emitted.`);
    });

    socket.on('next-question', ({ quizId }) => {
      if (socket.user.role !== 'teacher') return;
      emitNextQuestion(quizId, io);
    });

    // BROADCAST MESSAGE
    socket.on('send-message', ({ quizId, message }) => {
      if (socket.user.role !== 'teacher') return;
      if (!message || !message.trim()) return;

      console.log(`[SOCKET] Teacher ${socket.user.userId} broadcasting: ${message}`);
      io.to(quizId).emit('broadcast-message', {
        message: message.trim(),
        timestamp: Date.now()
      });
    });

    // REMOVE STUDENT (KICK)
    socket.on('remove-student', ({ quizId, studentId }) => {
      if (socket.user.role !== 'teacher') return;
      
      const state = activeQuizzes[quizId];
      if (!state) return;

      const studentSocketId = state.participants[studentId];
      if (studentSocketId) {
        const studentSocket = io.sockets.sockets.get(studentSocketId);
        if (studentSocket) {
          console.log(`[SOCKET] Kicking student ${studentId} from quiz ${quizId}`);
          studentSocket.emit('removed-from-quiz', {
            message: "You have been removed from the quiz by the teacher."
          });
          studentSocket.leave(quizId);
        }
        delete state.participants[studentId];

        // Update student list for teacher
        io.to(quizId).emit('participant-update', {
          participants: Object.keys(state.participants).map(id => ({
            userId: id,
            name: state.studentNames[id]
          }))
        });
      }
    });

    // ANTI-CHEATING: TAB SWITCH DETECTION
    socket.on('tab-switch', ({ quizId }) => {
      if (socket.user.role !== 'student') return;
      
      const state = activeQuizzes[quizId];
      if (!state) return;

      const userId = socket.user.userId;
      const now = Date.now();

      // Log event
      state.cheatingLogs.push({ userId, timestamp: now });
      state.cheatingCount[userId] = (state.cheatingCount[userId] || 0) + 1;

      // Suspicious Tracking
      if (state.suspiciousUsers[userId]) {
        state.suspiciousUsers[userId].tabSwitchCount++;
        
        // Flag Logic
        if (state.suspiciousUsers[userId].tabSwitchCount > 2 && !state.suspiciousUsers[userId].flagged) {
          state.suspiciousUsers[userId].flagged = true;
          if (state.teacherSocketId) {
            io.to(state.teacherSocketId).emit('suspicious-alert', {
              userId,
              name: state.studentNames[userId],
              reason: "Frequent tab switching",
              stats: state.suspiciousUsers[userId]
            });
          }
        }
      }

      console.log(`[SOCKET] Anti-Cheating: Student ${userId} switched tab in quiz ${quizId}`);

      // Notify teacher
      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('cheating-alert', {
          userId,
          name: state.studentNames[userId],
          message: "Switched tab / Minimized window",
          count: state.cheatingCount[userId],
          timestamp: now
        });
      }
    });

    socket.on('end-quiz', async ({ quizId }) => {
      if (socket.user.role !== 'teacher') return;
      handleEndQuiz(quizId, io);
    });

    // ==========================================
    // STUDENT SUBMISSIONS
    // ==========================================
    socket.on('submit-answer', ({ quizId, questionIndex, selectedOptionIndex }) => {
      if (socket.user.role !== 'student') return;
      
      const userId = socket.user.userId;
      console.log(`[SOCKET] Answer received from User: ${userId} | Question: ${questionIndex} | Option: ${selectedOptionIndex}`);

      if (selectedOptionIndex === undefined || selectedOptionIndex === null) {
        console.error("[SOCKET] Invalid answer submission: selectedOptionIndex is missing");
        return;
      }

      const state = activeQuizzes[quizId];
      if (!state) return;

      if (state.timeLeft <= 0) return;

      // Duplicate Prevention Logic
      if (!state.submittedFlags[userId]) {
        state.submittedFlags[userId] = {};
      }
      if (state.submittedFlags[userId][questionIndex]) {
        console.log(`[SOCKET] Duplicate answer ignored for User: ${userId}, Question: ${questionIndex}`);
        return;
      }
      state.submittedFlags[userId][questionIndex] = true;

      const question = state.quizDoc.questions[questionIndex];
      const now = Date.now();
      const responseTime = state.questionStartTime ? (now - state.questionStartTime) / 1000 : 0;

      const selectedIdx = Number(selectedOptionIndex);
      const correctIdx = Number(question.correctOptionIndex);
      
      const selectedValue = question.options[selectedIdx];
      const correctValue = question.options[correctIdx];
      const isCorrect = selectedValue === correctValue;

      console.log(`[DEBUG] User: ${userId} | Q: ${questionIndex}`);
      console.log(`[DEBUG] Selected: ${selectedIdx} ("${selectedValue}")`);
      console.log(`[DEBUG] Correct: ${correctIdx} ("${correctValue}")`);
      console.log(`[DEBUG] Options:`, question.options);
      console.log(`[DEBUG] Is Correct: ${isCorrect}`);

      // Record Answer for Analytics
      if (state.studentAnswers[userId]) {
        state.studentAnswers[userId].push({
          questionId: question._id,
          selectedOptionIndex: selectedIdx,
          selectedValue,
          isCorrect,
          timeTaken: responseTime
        });
      }

      // Suspicious Detection: Fast Answer
      if (state.questionStartTime && state.suspiciousUsers[userId]) {
        if (responseTime < 2) {
          state.suspiciousUsers[userId].fastAnswerCount++;
          
          // Flag if too many fast answers
          if (state.suspiciousUsers[userId].fastAnswerCount > 3 && !state.suspiciousUsers[userId].flagged) {
            state.suspiciousUsers[userId].flagged = true;
            if (state.teacherSocketId) {
              io.to(state.teacherSocketId).emit('suspicious-alert', {
                userId,
                name: state.studentNames[userId],
                reason: "Suspiciously fast answers",
                stats: state.suspiciousUsers[userId]
              });
            }
          }
        }
      }

      if (!state.studentScores[userId]) {
         state.studentScores[userId] = { score: 0, lastAnswerTime: now };
      }

      const negMarking = state.quizDoc.negativeMarking || { enabled: false, value: 0 };

      if (isCorrect) {
        state.studentScores[userId].score += 1;
        state.studentScores[userId].lastAnswerTime = now;
      } else if (negMarking.enabled) {
        state.studentScores[userId].score -= Number(negMarking.value);
        state.studentScores[userId].lastAnswerTime = now;
      }

      // Notify teacher of the specific answer selected by the student
      io.to(quizId).emit('answer-update', {
        userId: socket.user.userId,
        questionIndex,
        selectedOptionIndex: Number(selectedOptionIndex),
        isCorrect
      });
      
      state.studentNames[socket.user.userId] = socket.user.name || `Student ${socket.user.userId.slice(-4)}`;
    });

    socket.on('disconnect', () => {
      // Find which quiz the user was in and remove from participants
      for (const quizId in activeQuizzes) {
        const state = activeQuizzes[quizId];
        if (state.participants[socket.user.userId]) {
          delete state.participants[socket.user.userId];

          // Log disconnect for rejoin tracking
          if (socket.user.role === 'student') {
            if (!state.disconnectedUsers[socket.user.userId]) {
              state.disconnectedUsers[socket.user.userId] = {
                lastDisconnectTime: Date.now(),
                rejoinCount: 0
              };
            } else {
              state.disconnectedUsers[socket.user.userId].lastDisconnectTime = Date.now();
            }
          }

          io.to(quizId).emit('participant-update', {
            participants: Object.keys(state.participants).map(id => ({
              userId: id,
              name: state.studentNames[id],
              flagged: state.suspiciousUsers[id]?.flagged,
              stats: state.suspiciousUsers[id]
            }))
          });
        }
      }
      console.log(`[SOCKET] User disconnected: ${socket.user.userId}`);
    });
  });
};
