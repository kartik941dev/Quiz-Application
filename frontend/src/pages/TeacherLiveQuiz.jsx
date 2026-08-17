import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const TeacherLiveQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [socket, setSocket] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [liveLeaderboardEnabled, setLiveLeaderboardEnabled] = useState(true);
  const [progressionMode, setProgressionMode] = useState('auto_timer');
  const [shuffleQuestionsEnabled, setShuffleQuestionsEnabled] = useState(true);
  const [shuffleOptionsEnabled, setShuffleOptionsEnabled] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState({}); // userId -> { selectedOptionIndex, isCorrect, textResponse }
  const [cheatingAlerts, setCheatingAlerts] = useState([]);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  // Initialize Socket and fetch Quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get('/quiz/my-quizzes');
        const active = res.data.quizzes.find(q => q._id === id);
        if (active) {
          if (active.isClosed) {
            alert('This quiz is permanently closed and cannot be hosted.');
            navigate('/teacher-dashboard');
            return;
          }
          setQuiz(active);
          setTotalQuestions(active.questions?.length || 0);
          setLiveLeaderboardEnabled(active.showLeaderboard !== false);
          setProgressionMode(active.progressionMode || 'auto_timer');
          setShuffleQuestionsEnabled(active.shuffleQuestions !== false);
          setShuffleOptionsEnabled(active.shuffleOptions !== false);
        }
      } catch (err) {
        console.error('Failed to load quiz for hosting', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();

    const token = localStorage.getItem('token');
    const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const cleanSocketUrl = rawSocketUrl.replace(/\/$/, "");
    const newSocket = io(cleanSocketUrl, { auth: { token } });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-quiz', { quizId: id });
    });

    newSocket.on('teacher-init-state', (data) => {
      if (data.shuffleQuestions !== undefined) setShuffleQuestionsEnabled(data.shuffleQuestions);
      if (data.shuffleOptions !== undefined) setShuffleOptionsEnabled(data.shuffleOptions);
      if (data.showLeaderboard !== undefined) setLiveLeaderboardEnabled(data.showLeaderboard);
      if (data.progressionMode) setProgressionMode(data.progressionMode);
      if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
      if (data.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
        setCurrentQuestionIndex(data.currentQuestionIndex);
      }
    });

    newSocket.on('teacher-question-data', (data) => {
      setCurrentQuestionIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
      setLeaderboard([]);
      setStudentAnswers({});
    });

    newSocket.on('question', (data) => {
      setCurrentQuestionIndex(data.questionIndex);
      if (data.question) {
        setCurrentQuestion(prev => ({
          ...data.question,
          ...(prev && prev._id === data.question._id ? prev : {})
        }));
      }
      if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
      setLeaderboard([]);
      setStudentAnswers({}); // Clear student selections for new question
    });

    newSocket.on('answer-update', (data) => {
      setStudentAnswers(prev => ({
        ...prev,
        [data.userId]: { 
          selectedOptionIndex: data.selectedOptionIndex, 
          selectedOptionIndices: data.selectedOptionIndices,
          textResponse: data.textResponse,
          isCorrect: data.isCorrect 
        }
      }));
    });

    newSocket.on('leaderboard-update', (data) => {
      setLeaderboard(data.leaderboard);
    });

    newSocket.on('participant-update', (data) => {
      setParticipants(data.participants);
    });

    newSocket.on('cheating-alert', (data) => {
      setCheatingAlerts(prev => [data, ...prev].slice(0, 10));
    });

    newSocket.on('timer', (data) => {
      setTimeLeft(data.timeLeft);
    });

    newSocket.on('suspicious-alert', (data) => {
      setCheatingAlerts(prev => [{ ...data, type: 'suspicious' }, ...prev].slice(0, 10));
      // Update participants list to show flagged status
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId ? { ...p, flagged: true, stats: data.stats } : p
      ));
    });

    newSocket.on('shuffle-status-updated', (data) => {
      setShuffleQuestionsEnabled(data.shuffleQuestions);
      setShuffleOptionsEnabled(data.shuffleOptions);
    });

    newSocket.on('leaderboard-toggle-status', (data) => {
      setLiveLeaderboardEnabled(data.showLeaderboard);
    });

    newSocket.on('progression-mode-updated', (data) => {
      setProgressionMode(data.progressionMode);
    });

    newSocket.on('quiz-ended', () => {
      alert('Quiz has ended. Redirecting to dashboard...');
      navigate('/teacher-dashboard');
    });

    return () => newSocket.disconnect();
  }, [id]);

  const handleToggleLiveLeaderboard = () => {
    const nextState = !liveLeaderboardEnabled;
    setLiveLeaderboardEnabled(nextState);
    if (socket) {
      socket.emit('toggle-leaderboard', { quizId: id, showLeaderboard: nextState });
    }
  };

  const handleToggleShuffleQuestions = () => {
    const nextState = !shuffleQuestionsEnabled;
    setShuffleQuestionsEnabled(nextState);
    if (socket) {
      socket.emit('toggle-shuffle-questions', { quizId: id, shuffleQuestions: nextState });
    }
  };

  const handleToggleShuffleOptions = () => {
    const nextState = !shuffleOptionsEnabled;
    setShuffleOptionsEnabled(nextState);
    if (socket) {
      socket.emit('toggle-shuffle-options', { quizId: id, shuffleOptions: nextState });
    }
  };

  const handleChangeProgressionMode = (newMode) => {
    setProgressionMode(newMode);
    if (socket) {
      socket.emit('change-progression-mode', { quizId: id, progressionMode: newMode });
    }
  };

  const handleNextQuestion = () => {
    if (socket) {
      if (currentQuestionIndex === -1) {
        socket.emit('start-quiz', { quizId: id });
      } else {
        socket.emit('next-question', { quizId: id });
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (socket && message.trim()) {
      socket.emit('send-message', { quizId: id, message });
      setMessage('');
      alert('Message broadcasted!');
    }
  };

  const handleRemoveStudent = (studentId) => {
    if (socket && window.confirm('Are you sure you want to remove this student?')) {
      socket.emit('remove-student', { quizId: id, studentId });
    }
  };

  const handleEndQuiz = () => {
    if (socket) {
      socket.emit('end-quiz', { quizId: id });
      navigate('/teacher-dashboard');
    }
  };

  if (loading) return <div className="loading" style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Loading Live Dashboard...</div>;
  if (!quiz) return <div className="error-message" style={{ color: '#ff4a4a', textAlign: 'center' }}>Quiz not found or you are not the owner.</div>;

  const isFinished = currentQuestionIndex >= quiz.questions.length - 1;

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Main Control Panel */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Hosting: {quiz.title}</h2>
          <div style={{ fontSize: '1.1rem', marginBottom: '1.5rem', padding: '0.85rem 1.25rem', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Join Code:</span>
              <span style={{ 
                fontSize: '1.5rem', 
                letterSpacing: '2.5px', 
                color: 'var(--primary)', 
                background: 'var(--primary-subtle)',
                padding: '3px 12px',
                borderRadius: '6px',
                border: '1px solid var(--primary-border)',
                fontFamily: 'monospace',
                fontWeight: 700 
              }}>
                {quiz.joinCode}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {/* Progression Mode Switcher */}
              <button
                type="button"
                onClick={() => handleChangeProgressionMode(progressionMode === 'auto_timer' ? 'manual' : 'auto_timer')}
                style={{
                  background: progressionMode === 'auto_timer' ? '#e0f2fe' : '#fef3c7',
                  color: progressionMode === 'auto_timer' ? '#0369a1' : '#b45309',
                  border: `1.5px solid ${progressionMode === 'auto_timer' ? '#0284c7' : '#f59e0b'}`,
                  padding: '0.45rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.2s ease'
                }}
                title="Click to switch between Auto on Time-Up and Teacher Manual Next"
              >
                <span>{progressionMode === 'auto_timer' ? '⏱️ Auto Time-Up' : '👨‍🏫 Manual Next'}</span>
              </button>

              {/* Live Leaderboard ON/OFF Switch */}
              <button
                type="button"
                onClick={handleToggleLiveLeaderboard}
                style={{
                  background: liveLeaderboardEnabled ? 'var(--primary-subtle)' : '#f1f5f9',
                  color: liveLeaderboardEnabled ? 'var(--primary)' : 'var(--text-muted)',
                  border: `1.5px solid ${liveLeaderboardEnabled ? 'var(--primary)' : '#cbd5e1'}`,
                  padding: '0.45rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.2s ease'
                }}
                title="Click to toggle live leaderboard ranking during the exam"
              >
                <span>🏆 Leaderboard:</span>
                <span style={{ 
                  padding: '2px 7px', 
                  borderRadius: '10px', 
                  background: liveLeaderboardEnabled ? 'var(--primary)' : '#94a3b8', 
                  color: '#ffffff',
                  fontSize: '0.72rem'
                }}>
                  {liveLeaderboardEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {currentQuestionIndex >= 0 && (
              <div style={{ fontSize: '1.3rem', color: timeLeft <= 5 ? 'var(--status-error-text)' : 'var(--text-main)', fontWeight: 600 }}>⏳ {timeLeft}s</div>
            )}
          </div>

          {currentQuestionIndex === -1 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Waiting to start...</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem' }}>Tell your students to join using the join code above!</p>
              
              {/* Pre-Exam Shuffling Toggles */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleToggleShuffleQuestions}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: shuffleQuestionsEnabled ? 'var(--primary-subtle)' : '#f1f5f9',
                    color: shuffleQuestionsEnabled ? 'var(--primary)' : 'var(--text-muted)',
                    border: `1.5px solid ${shuffleQuestionsEnabled ? 'var(--primary)' : '#cbd5e1'}`,
                    transition: 'all 0.2s ease'
                  }}
                  title="Toggle question order shuffling"
                >
                  🔀 Questions: {shuffleQuestionsEnabled ? 'Shuffled ON' : 'Original OFF'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleShuffleOptions}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: shuffleOptionsEnabled ? 'var(--primary-subtle)' : '#f1f5f9',
                    color: shuffleOptionsEnabled ? 'var(--primary)' : 'var(--text-muted)',
                    border: `1.5px solid ${shuffleOptionsEnabled ? 'var(--primary)' : '#cbd5e1'}`,
                    transition: 'all 0.2s ease'
                  }}
                  title="Toggle option choices shuffling"
                >
                  🔀 Option Choices: {shuffleOptionsEnabled ? 'Shuffled ON' : 'Original OFF'}
                </button>
              </div>

              <button className="btn" onClick={handleNextQuestion} style={{ width: 'auto', fontSize: '1.1rem', padding: '0.75rem 2.5rem' }}>
                Start First Question
              </button>
            </div>
          ) : (
            (() => {
              const activeQ = currentQuestion || (quiz.questions && quiz.questions[currentQuestionIndex]) || {};
              const qType = activeQ.type || 'single_choice';
              const numQuestions = totalQuestions || quiz.questions?.length || 0;

              return (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <h3 style={{ margin: 0 }}>Question {currentQuestionIndex + 1} of {numQuestions}</h3>
                      <div style={{ 
                        background: 'var(--primary-subtle)', 
                        padding: '0.4rem 0.8rem', 
                        borderRadius: '6px', 
                        color: 'var(--primary)', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        border: '1px solid var(--primary-border)'
                      }}>
                        Q {currentQuestionIndex + 1} / {numQuestions}
                      </div>
                    </div>
                    {isFinished ? (
                      <button className="btn" onClick={handleEndQuiz} style={{ width: 'auto', background: '#dc2626', marginTop: 0 }}>End Quiz</button>
                    ) : (
                      <button className="btn" onClick={handleNextQuestion} style={{ width: 'auto', marginTop: 0 }}>Next Question</button>
                    )}
                  </div>

                  {/* Mini Palette for Teacher Overview */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, 32px)', 
                    gap: '8px', 
                    marginBottom: '1.5rem',
                    padding: '0.75rem',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}>
                    {Array.from({ length: numQuestions }).map((_, idx) => {
                      const isCurrent = idx === currentQuestionIndex;
                      const isPast = idx < currentQuestionIndex;
                      
                      return (
                        <div 
                          key={idx}
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            backgroundColor: isCurrent ? 'var(--primary)' : (isPast ? '#059669' : '#e2e8f0'),
                            color: isCurrent || isPast ? '#ffffff' : '#64748b',
                            border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border-subtle)'
                          }}
                        >
                          {idx + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Question Display */}
                  <div style={{ padding: '1.25rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                        {qType === 'multiple_choice' ? '☑️ Multiple Choice' : (qType === 'true_false' ? '⚖️ True / False' : (qType === 'fill_in_the_blank' ? '✏️ Fill in Blank' : (qType === 'essay_code' ? `💻 Code / Essay (${activeQ.codeLanguage || 'General'})` : '🔘 Single Choice')))}
                      </span>
                      {activeQ.marks && (
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                          +{activeQ.marks} marks
                        </span>
                      )}
                    </div>
                    
                    <h4 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {activeQ.text}
                    </h4>
                    
                    {/* 1. Choice Options Display (Single / Multi / True-False) */}
                    {(qType === 'single_choice' || qType === 'multiple_choice' || qType === 'true_false') && activeQ.options && activeQ.options.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: activeQ.options.length > 2 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                        {activeQ.options.map((opt, i) => {
                          const isSingleCorrect = i === activeQ.correctOptionIndex;
                          const isMultiCorrect = Array.isArray(activeQ.correctOptionIndices) && activeQ.correctOptionIndices.includes(i);
                          const isCorrect = qType === 'multiple_choice' ? isMultiCorrect : isSingleCorrect;

                          return (
                            <div key={i} style={{ 
                              padding: '0.85rem 1rem', 
                              background: isCorrect ? 'var(--status-success-bg)' : '#ffffff', 
                              border: isCorrect ? '1.5px solid #10b981' : '1px solid var(--border-subtle)', 
                              borderRadius: '6px',
                              fontSize: '0.95rem',
                              color: isCorrect ? '#065f46' : 'var(--text-main)',
                              fontWeight: isCorrect ? 700 : 400,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>{opt}</span>
                              {isCorrect && <span style={{ fontWeight: 800 }}>✅ Correct</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Fill in the blank Accepted Answers Display */}
                    {qType === 'fill_in_the_blank' && (
                      <div style={{ padding: '0.85rem 1rem', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Accepted Answers: </span>
                        <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                          {activeQ.acceptedAnswers && activeQ.acceptedAnswers.length > 0 ? activeQ.acceptedAnswers.join(', ') : 'Any string'}
                        </strong>
                      </div>
                    )}

                    {/* 3. Code / Essay Display */}
                    {qType === 'essay_code' && (
                      <div style={{ padding: '0.85rem 1rem', background: '#0f172a', borderRadius: '6px', border: '1px solid #334155', color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                          Language: {activeQ.codeLanguage || 'General / Markdown'}
                        </div>
                        <div style={{ opacity: 0.8 }}>Students submit code or written text in monospaced response box.</div>
                      </div>
                    )}
                  </div>

                  {leaderboard.length > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--primary-subtle)', borderRadius: '8px', border: '1px solid var(--primary-border)', marginBottom: '1.5rem' }}>
                      <h4 style={{ textAlign: 'center', marginBottom: '0.75rem', color: 'var(--primary)' }}>🏆 Current Top Performers</h4>
                      {leaderboard.map((student, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span>{i + 1}. {student.name}</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{student.score} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Broadcast Messaging */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>📣 Broadcast Announcement</h4>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Type a message to all students..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn" style={{ width: 'auto', marginTop: 0, background: '#646cff' }}>Send</button>
            </form>
          </div>
        </div>

        {/* Sidebar: Participants & Cheating Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Students ({participants.length})
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {participants.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>No students joined yet.</p>
              ) : (
                participants.map((p) => {
                  const answer = studentAnswers[p.userId];
                  const labels = ["A", "B", "C", "D"];
                  
                  return (
                    <div 
                      key={p.userId} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        padding: '0.75rem', 
                        background: p.flagged ? 'rgba(255, 74, 74, 0.25)' : 'rgba(0,0,0,0.2)', 
                        borderRadius: '6px', 
                        marginBottom: '0.5rem',
                        border: p.flagged ? '1px solid #ff4a4a' : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: p.flagged ? 'bold' : 'normal' }}>
                          {p.flagged && '⚠️ '} {p.name}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {answer && (
                            <span style={{ 
                              fontSize: '0.8rem', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              background: answer.isCorrect ? '#4caf50' : '#ff4a4a',
                              color: 'white',
                              fontWeight: 'bold'
                            }}>
                              Opt {labels[answer.selectedOptionIndex]}
                            </span>
                          )}
                          <button 
                            onClick={() => handleRemoveStudent(p.userId)}
                            style={{ background: 'transparent', border: 'none', color: '#ff4a4a', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Kick
                          </button>
                        </div>
                      </div>
                      {p.flagged && p.stats && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.4rem' }}>
                          ⚡ Fast: {p.stats.fastAnswerCount} | 🔄 Tabs: {p.stats.tabSwitchCount}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-card" style={{ border: cheatingAlerts.length > 0 ? '1px solid #ff4a4a' : '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: cheatingAlerts.length > 0 ? '#ff4a4a' : 'white' }}>
              ⚠️ Suspicious Activity
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {cheatingAlerts.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>No violations detected.</p>
              ) : (
                cheatingAlerts.map((alert, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'rgba(255, 74, 74, 0.1)', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid rgba(255, 74, 74, 0.2)' }}>
                    <div style={{ fontWeight: 'bold', color: '#ff4a4a', fontSize: '0.9rem' }}>{alert.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: '0.2rem 0' }}>{alert.message}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      <span>Violation #{alert.count}</span>
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TeacherLiveQuiz;
