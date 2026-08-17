const jwt = require('jsonwebtoken');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in backend/.env');
}

// In-Memory State Manager
const activeQuizzes = {};

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const activeSocketUsers = {}; // userId -> socketId

module.exports = (io) => {
  
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  const handleEndQuiz = async (quizId, io) => {
    try {
      const state = activeQuizzes[quizId];
      if (!state) return;

      if (state.timerId) clearInterval(state.timerId);
      if (state.autoProgressionTimeoutId) {
        clearTimeout(state.autoProgressionTimeoutId);
        state.autoProgressionTimeoutId = null;
      }

      const totalQuestions = state.quizDoc?.questions?.length || 0;
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
    } catch (err) {
      console.error('[SOCKET] Error in handleEndQuiz:', err);
    }
  };

  const startTimer = (quizId, io, initialTime) => {
    const state = activeQuizzes[quizId];
    if (!state) return;

    if (state.timerId) clearInterval(state.timerId);
    
    let timeLeft = initialTime;
    state.timeLeft = timeLeft;
    io.to(quizId).emit('timer', { timeLeft });

    state.timerId = setInterval(() => {
      try {
        if (!activeQuizzes[quizId]) {
          clearInterval(state.timerId);
          return;
        }
        
        timeLeft--;
        state.timeLeft = timeLeft;
        
        if (timeLeft <= 0) {
          clearInterval(state.timerId);
          io.to(quizId).emit('time-up');
          
          if (state.autoProgressionTimeoutId) {
            clearTimeout(state.autoProgressionTimeoutId);
            state.autoProgressionTimeoutId = null;
          }
          
          // Auto progress only if mode is auto_timer
          if (state.progressionMode !== 'manual' && state.progressionMode !== 'self_paced') {
            state.autoProgressionTimeoutId = setTimeout(() => {
              emitNextQuestion(quizId, io);
            }, 2000);
          }
        } else {
          io.to(quizId).emit('timer', { timeLeft });
        }
      } catch (err) {
        console.error('[SOCKET] Timer interval error:', err);
        clearInterval(state.timerId);
      }
    }, 1000);
  };

  const emitNextQuestion = (quizId, io) => {
    try {
      const state = activeQuizzes[quizId];
      if (!state) return;

      if (state.autoProgressionTimeoutId) {
        clearTimeout(state.autoProgressionTimeoutId);
        state.autoProgressionTimeoutId = null;
      }

      state.currentQuestionIndex++;
      
      if (state.currentQuestionIndex >= (state.quizDoc.questions?.length || 0)) {
        handleEndQuiz(quizId, io);
        return;
      }

      const q = state.quizDoc.questions[state.currentQuestionIndex];
      const qNum = state.currentQuestionIndex;
      const isLeaderboardEnabled = state.showLeaderboard !== false;
      const showLeaderboard = isLeaderboardEnabled && qNum > 0 && qNum % (state.quizDoc.leaderboardInterval || 1) === 0;

      if (showLeaderboard) {
        const topScores = Object.keys(state.studentScores)
          .map(id => ({ 
            name: state.studentNames[id], 
            score: state.studentScores[id]?.score || 0,
            lastAnswerTime: state.studentScores[id]?.lastAnswerTime || 0
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
        try {
          if (!activeQuizzes[quizId]) return; 
          state.questionStartTime = Date.now();
          
          // Emit sanitized question to students in room
          io.to(quizId).emit('question', {
            questionIndex: state.currentQuestionIndex,
            totalQuestions: state.quizDoc.questions.length,
            question: { 
              _id: q._id,
              text: q.text, 
              type: q.type || 'single_choice',
              options: (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'true_false') ? (q.options || []) : [],
              codeLanguage: q.codeLanguage,
              timeLimit: q.timeLimit,
              marks: q.marks || 1
            },
            timeLeft: q.timeLimit
          });

          // Emit complete question with correct answers to teacher
          if (state.teacherSocketId) {
            io.to(state.teacherSocketId).emit('teacher-question-data', {
              questionIndex: state.currentQuestionIndex,
              totalQuestions: state.quizDoc.questions.length,
              question: {
                _id: q._id,
                text: q.text,
                type: q.type || 'single_choice',
                options: (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'true_false') ? (q.options || []) : [],
                correctOptionIndex: q.correctOptionIndex,
                correctOptionIndices: q.correctOptionIndices || [],
                acceptedAnswers: q.acceptedAnswers || [],
                codeLanguage: q.codeLanguage,
                timeLimit: q.timeLimit,
                marks: q.marks || 1,
                explanation: q.explanation || ''
              },
              timeLeft: q.timeLimit
            });
          }

          startTimer(quizId, io, q.timeLimit);
        } catch (err) {
          console.error('[SOCKET] Error in next-question timeout:', err);
        }
      }, delayMs);
    } catch (err) {
      console.error('[SOCKET] Error in emitNextQuestion:', err);
    }
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
      try {
        if (!quizId) return;
        socket.join(quizId);
        console.log(`[SOCKET] User ${socket.user.userId} joined room ${quizId}`);
        
        let state = activeQuizzes[quizId];
        
        // If state doesn't exist, and teacher joins, initialize it
        if (!state && socket.user.role === 'teacher') {
          try {
            const quiz = await Quiz.findById(quizId);
            if (quiz && quiz.teacherId.toString() === socket.user.userId) {
              if (quiz.isClosed) {
                socket.emit('error-alert', { message: "This quiz is permanently closed and cannot be hosted." });
                return;
              }

              // ALGORITHMIC SHUFFLING
              let questionsToUse = [...(quiz.questions || [])];
              if (quiz.shuffleQuestions !== false) {
                questionsToUse = shuffleArray(questionsToUse);
              }

              const processedQuestions = questionsToUse.map(q => {
                const qObj = q.toObject ? q.toObject() : { ...q };
                
                // Shuffle options for single_choice & multiple_choice if enabled
                if (quiz.shuffleOptions !== false && (qObj.type === 'single_choice' || qObj.type === 'multiple_choice') && qObj.options && qObj.options.length > 1) {
                  const originalOptions = [...qObj.options];
                  const shuffledOptions = shuffleArray(originalOptions);
                  
                  // Remap correct index/indices
                  if (qObj.type === 'single_choice') {
                    const correctText = originalOptions[qObj.correctOptionIndex];
                    qObj.correctOptionIndex = shuffledOptions.indexOf(correctText);
                  } else if (qObj.type === 'multiple_choice' && Array.isArray(qObj.correctOptionIndices)) {
                    const correctTexts = qObj.correctOptionIndices.map(idx => originalOptions[idx]);
                    qObj.correctOptionIndices = correctTexts.map(t => shuffledOptions.indexOf(t));
                  }
                  
                  qObj.options = shuffledOptions;
                }

                return qObj;
              });

              activeQuizzes[quizId] = {
                quizDoc: { ...quiz.toObject(), questions: processedQuestions },
                progressionMode: quiz.progressionMode || 'auto_timer',
                showLeaderboard: quiz.showLeaderboard !== false,
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
                studentAnswers: {}, 
                studentStartTime: {} 
              };
              state = activeQuizzes[quizId];
              console.log(`[SOCKET] Quiz state initialized with Advanced Question Suite for ${quizId}`);
            }
          } catch (err) {
            console.error('[SOCKET] Error initializing quiz:', err);
          }
        }

        if (state) {
          if (socket.user.role === 'teacher') {
            state.teacherSocketId = socket.id;
            
            // Send complete initial state to teacher including active questions order
            socket.emit('teacher-init-state', {
              shuffleQuestions: state.quizDoc.shuffleQuestions !== false,
              shuffleOptions: state.quizDoc.shuffleOptions !== false,
              showLeaderboard: state.showLeaderboard !== false,
              progressionMode: state.progressionMode,
              totalQuestions: state.quizDoc.questions?.length || 0,
              currentQuestionIndex: state.currentQuestionIndex,
              currentQuestion: state.currentQuestionIndex >= 0 ? state.quizDoc.questions[state.currentQuestionIndex] : null,
              questions: state.quizDoc.questions
            });
          }

          if (socket.user.role === 'student') {
            const now = Date.now();
            const disconnectInfo = state.disconnectedUsers[userId];
            if (disconnectInfo) {
              const secondsAway = (now - disconnectInfo.time) / 1000;
              if (secondsAway > 60) {
                socket.emit('rejoin-denied', { message: "Rejoin timeout exceeded (Maximum 60 seconds allowed away)." });
                return;
              }

              if (disconnectInfo.rejoinCount >= 3) {
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
              socket.emit('question', {
                questionIndex: state.currentQuestionIndex,
                question: { 
                  _id: q._id,
                  text: q.text, 
                  type: q.type || 'single_choice',
                  options: q.options || [],
                  codeLanguage: q.codeLanguage,
                  timeLimit: q.timeLimit,
                  marks: q.marks || 1
                },
                timeLeft: state.timeLeft || 0,
                isRestore: true
              });
              socket.emit('timer', { timeLeft: state.timeLeft || 0 });
            }
            
            // Notify teacher
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
      } catch (err) {
        console.error('[SOCKET] Error in join-quiz:', err);
      }
    });

    // ==========================================
    // TEACHER CONTROLS
    // ==========================================
    socket.on('start-quiz', async ({ quizId }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        
        let state = activeQuizzes[quizId];
        if (!state) return;

        state.currentQuestionIndex = 0;
        state.questionStartTime = Date.now();
        const q = state.quizDoc.questions[0];
        
        io.to(quizId).emit('question', {
          questionIndex: 0,
          question: { 
            _id: q._id,
            text: q.text, 
            type: q.type || 'single_choice',
            options: q.options || [],
            codeLanguage: q.codeLanguage,
            timeLimit: q.timeLimit,
            marks: q.marks || 1
          },
          timeLeft: q.timeLimit
        });

        startTimer(quizId, io, q.timeLimit);
        console.log(`[SOCKET] Quiz ${quizId} started. Question 0 emitted.`);
      } catch (err) {
        console.error('[SOCKET] Error in start-quiz:', err);
      }
    });

    socket.on('next-question', ({ quizId }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        emitNextQuestion(quizId, io);
      } catch (err) {
        console.error('[SOCKET] Error in next-question:', err);
      }
    });

    socket.on('send-message', ({ quizId, message }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        if (!message || !message.trim()) return;

        console.log(`[SOCKET] Teacher ${socket.user.userId} broadcasting: ${message}`);
        io.to(quizId).emit('broadcast-message', {
          message: message.trim(),
          timestamp: Date.now()
        });
      } catch (err) {
        console.error('[SOCKET] Error in send-message:', err);
      }
    });

    socket.on('remove-student', ({ quizId, studentId }) => {
      try {
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

          io.to(quizId).emit('participant-update', {
            participants: Object.keys(state.participants).map(id => ({
              userId: id,
              name: state.studentNames[id]
            }))
          });
        }
      } catch (err) {
        console.error('[SOCKET] Error in remove-student:', err);
      }
    });

    socket.on('end-quiz', ({ quizId }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        handleEndQuiz(quizId, io);
      } catch (err) {
        console.error('[SOCKET] Error in end-quiz:', err);
      }
    });

    socket.on('toggle-leaderboard', ({ quizId, showLeaderboard }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        const state = activeQuizzes[quizId];
        if (!state) return;

        state.showLeaderboard = Boolean(showLeaderboard);
        console.log(`[SOCKET] Quiz ${quizId} live leaderboard status changed: ${state.showLeaderboard}`);
        io.to(quizId).emit('leaderboard-toggle-status', { showLeaderboard: state.showLeaderboard });
      } catch (err) {
        console.error('[SOCKET] Error in toggle-leaderboard:', err);
      }
    });

    socket.on('change-progression-mode', ({ quizId, progressionMode }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        const state = activeQuizzes[quizId];
        if (!state) return;

        state.progressionMode = progressionMode;
        console.log(`[SOCKET] Quiz ${quizId} progression mode changed to: ${state.progressionMode}`);
        io.to(quizId).emit('progression-mode-updated', { progressionMode: state.progressionMode });
      } catch (err) {
        console.error('[SOCKET] Error in change-progression-mode:', err);
      }
    });

    socket.on('toggle-shuffle-questions', async ({ quizId, shuffleQuestions }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        const state = activeQuizzes[quizId];
        if (!state) return;

        state.quizDoc.shuffleQuestions = Boolean(shuffleQuestions);
        console.log(`[SOCKET] Quiz ${quizId} shuffleQuestions set to: ${state.quizDoc.shuffleQuestions}`);
        
        // If not started yet, re-shuffle questions
        if (state.currentQuestionIndex === -1) {
          const originalQuiz = await Quiz.findById(quizId);
          if (originalQuiz) {
            let qs = [...(originalQuiz.questions || [])];
            if (state.quizDoc.shuffleQuestions) {
              qs = shuffleArray(qs);
            }
            state.quizDoc.questions = qs;
            socket.emit('teacher-init-state', {
              shuffleQuestions: state.quizDoc.shuffleQuestions,
              shuffleOptions: state.quizDoc.shuffleOptions !== false,
              showLeaderboard: state.showLeaderboard !== false,
              progressionMode: state.progressionMode,
              totalQuestions: state.quizDoc.questions.length,
              currentQuestionIndex: -1,
              questions: state.quizDoc.questions
            });
          }
        }

        io.to(quizId).emit('shuffle-status-updated', {
          shuffleQuestions: state.quizDoc.shuffleQuestions,
          shuffleOptions: state.quizDoc.shuffleOptions
        });
      } catch (err) {
        console.error('[SOCKET] Error in toggle-shuffle-questions:', err);
      }
    });

    socket.on('toggle-shuffle-options', ({ quizId, shuffleOptions }) => {
      try {
        if (socket.user.role !== 'teacher') return;
        const state = activeQuizzes[quizId];
        if (!state) return;

        state.quizDoc.shuffleOptions = Boolean(shuffleOptions);
        console.log(`[SOCKET] Quiz ${quizId} shuffleOptions set to: ${state.quizDoc.shuffleOptions}`);
        
        io.to(quizId).emit('shuffle-status-updated', {
          shuffleQuestions: state.quizDoc.shuffleQuestions,
          shuffleOptions: state.quizDoc.shuffleOptions
        });
      } catch (err) {
        console.error('[SOCKET] Error in toggle-shuffle-options:', err);
      }
    });

    socket.on('tab-switch', ({ quizId }) => {
      try {
        if (socket.user.role !== 'student') return;
        
        const state = activeQuizzes[quizId];
        if (!state) return;

        const userId = socket.user.userId;
        const now = Date.now();

        state.cheatingLogs.push({ userId, timestamp: now });
        state.cheatingCount[userId] = (state.cheatingCount[userId] || 0) + 1;

        if (state.suspiciousUsers[userId]) {
          state.suspiciousUsers[userId].tabSwitchCount++;
          
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

        if (state.teacherSocketId) {
          io.to(state.teacherSocketId).emit('cheating-alert', {
            userId,
            name: state.studentNames[userId],
            message: "Switched tab / Minimized window",
            count: state.cheatingCount[userId],
            timestamp: now
          });
        }
      } catch (err) {
        console.error('[SOCKET] Error in tab-switch:', err);
      }
    });

    // ==========================================
    // STUDENT ADVANCED EVALUATION
    // ==========================================
    socket.on('submit-answer', ({ 
      quizId, 
      questionIndex, 
      selectedOptionIndex, 
      selectedOptionIndices, 
      textResponse 
    }) => {
      try {
        if (socket.user.role !== 'student') return;
        
        const userId = socket.user.userId;
        const state = activeQuizzes[quizId];
        if (!state) return;

        if (state.timeLeft <= 0) return;

        // Duplicate Prevention
        if (!state.submittedFlags[userId]) state.submittedFlags[userId] = {};
        if (state.submittedFlags[userId][questionIndex]) return;
        state.submittedFlags[userId][questionIndex] = true;

        const question = state.quizDoc.questions[questionIndex];
        if (!question) return;

        const now = Date.now();
        const responseTime = state.questionStartTime ? (now - state.questionStartTime) / 1000 : 0;
        const qType = question.type || 'single_choice';

        let isCorrect = false;

        if (qType === 'single_choice' || qType === 'true_false') {
          const selectedIdx = Number(selectedOptionIndex);
          const correctIdx = Number(question.correctOptionIndex);
          const selectedValue = question.options[selectedIdx];
          const correctValue = question.options[correctIdx];
          isCorrect = selectedValue === correctValue;
        } else if (qType === 'multiple_choice') {
          const studentIndices = Array.isArray(selectedOptionIndices) ? selectedOptionIndices.map(Number) : [];
          const correctIndices = Array.isArray(question.correctOptionIndices) ? question.correctOptionIndices.map(Number) : [];
          
          const studentSet = new Set(studentIndices);
          const correctSet = new Set(correctIndices);
          isCorrect = studentSet.size === correctSet.size && [...studentSet].every(idx => correctSet.has(idx));
        } else if (qType === 'fill_in_the_blank') {
          const cleanText = (textResponse || '').trim().toLowerCase();
          const accepted = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
          isCorrect = accepted.some(a => (a || '').trim().toLowerCase() === cleanText);
        } else if (qType === 'essay_code') {
          // Code / Essay responses are recorded with full participation score
          isCorrect = Boolean((textResponse || '').trim());
        }

        const marksAwarded = isCorrect ? (question.marks || 1) : (state.quizDoc.negativeMarkingEnabled ? -(question.negativeMarks || 0) : 0);

        if (!state.studentAnswers[userId]) state.studentAnswers[userId] = [];
        state.studentAnswers[userId].push({
          questionId: question._id,
          selectedOptionIndex: typeof selectedOptionIndex === 'number' ? Number(selectedOptionIndex) : undefined,
          selectedOptionIndices: Array.isArray(selectedOptionIndices) ? selectedOptionIndices : [],
          textResponse: textResponse || '',
          isCorrect,
          marksAwarded,
          timeTaken: responseTime
        });

        // Suspicious Detection
        if (state.questionStartTime && state.suspiciousUsers[userId]) {
          if (responseTime < 2) {
            state.suspiciousUsers[userId].fastAnswerCount++;
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

        if (isCorrect) {
          state.studentScores[userId].score += (question.marks || 1);
        } else if (state.quizDoc.negativeMarkingEnabled) {
          state.studentScores[userId].score -= (question.negativeMarks || 0);
        }
        state.studentScores[userId].lastAnswerTime = now;

        console.log(`[SOCKET] User ${userId} answered Q${questionIndex} (${qType}): isCorrect=${isCorrect}, Score=${state.studentScores[userId].score}`);
      } catch (err) {
        console.error('[SOCKET] Error in submit-answer:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${userId}`);
      delete activeSocketUsers[userId];

      for (const quizId in activeQuizzes) {
        const state = activeQuizzes[quizId];
        if (state && state.participants[userId]) {
          delete state.participants[userId];
          
          if (socket.user.role === 'student') {
            state.disconnectedUsers[userId] = {
              time: Date.now(),
              rejoinCount: (state.disconnectedUsers[userId]?.rejoinCount || 0)
            };
          }

          io.to(quizId).emit('participant-update', {
            participants: Object.keys(state.participants).map(id => ({
              userId: id,
              name: state.studentNames[id]
            }))
          });
        }
      }
    });

  });
};
