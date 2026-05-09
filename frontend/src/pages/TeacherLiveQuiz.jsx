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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState({}); // userId -> { selectedOptionIndex, isCorrect }
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
        }
      } catch (err) {
        console.error('Failed to load quiz for hosting', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();

    const token = localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const newSocket = io(socketUrl, { auth: { token } });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-quiz', { quizId: id });
    });

    newSocket.on('question', (data) => {
      setCurrentQuestionIndex(data.questionIndex);
      setLeaderboard([]);
      setStudentAnswers({}); // Clear student selections for new question
    });

    newSocket.on('answer-update', (data) => {
      setStudentAnswers(prev => ({
        ...prev,
        [data.userId]: { 
          selectedOptionIndex: data.selectedOptionIndex, 
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

    newSocket.on('quiz-ended', () => {
      alert('Quiz has ended. Redirecting to dashboard...');
      navigate('/teacher-dashboard');
    });

    return () => newSocket.disconnect();
  }, [id]);

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
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#646cff' }}>Hosting: {quiz.title}</h2>
          <div style={{ fontSize: '1.1rem', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
            <div><strong>Join Code:</strong> <span style={{ fontSize: '1.5rem', letterSpacing: '2px', color: '#4caf50', marginLeft: '0.5rem' }}>{quiz.joinCode}</span></div>
            {currentQuestionIndex >= 0 && (
              <div style={{ fontSize: '1.5rem', color: timeLeft <= 5 ? '#ff4a4a' : 'white' }}>⏳ {timeLeft}s</div>
            )}
          </div>

          {currentQuestionIndex === -1 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3>Waiting to start...</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>Tell your students to join using the code above!</p>
              <button className="btn" onClick={handleNextQuestion} style={{ width: 'auto', fontSize: '1.1rem', padding: '0.75rem 2.5rem' }}>
                Start First Question
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Question {currentQuestionIndex + 1} of {quiz.questions.length}</h3>
                  <div style={{ 
                    background: 'rgba(59, 130, 246, 0.2)', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '6px', 
                    color: '#3b82f6', 
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    Q {currentQuestionIndex + 1} / {quiz.questions.length}
                  </div>
                </div>
                {isFinished ? (
                  <button className="btn" onClick={handleEndQuiz} style={{ width: 'auto', background: '#ff4a4a', marginTop: 0 }}>End Quiz</button>
                ) : (
                  <button className="btn" onClick={handleNextQuestion} style={{ width: 'auto', marginTop: 0 }}>Next Question</button>
                )}
              </div>

              {/* Mini Palette for Teacher Overview */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, 30px)', 
                gap: '8px', 
                marginBottom: '1.5rem',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px'
              }}>
                {quiz.questions.map((_, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isPast = idx < currentQuestionIndex;
                  
                  return (
                    <div 
                      key={idx}
                      style={{
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: isCurrent ? '#3b82f6' : (isPast ? '#22c55e' : '#1e293b'),
                        color: 'white',
                        border: isCurrent ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                        opacity: isPast || isCurrent ? 1 : 0.5
                      }}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{quiz.questions[currentQuestionIndex].text}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {quiz.questions[currentQuestionIndex].options.map((opt, i) => {
                    const labels = ["A", "B", "C", "D"];
                    const isCorrect = i === quiz.questions[currentQuestionIndex].correctOptionIndex;
                    return (
                      <div key={i} style={{ 
                        padding: '0.75rem', 
                        background: isCorrect ? 'rgba(76, 175, 80, 0.2)' : 'rgba(0,0,0,0.2)', 
                        border: isCorrect ? '1px solid #4caf50' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.95rem'
                      }}>
                        <strong style={{ color: isCorrect ? '#4caf50' : '#646cff', marginRight: '0.5rem' }}>{labels[i]}.</strong> {opt}
                        {isCorrect && <span style={{ float: 'right' }}>✅</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {leaderboard.length > 0 && (
                <div style={{ padding: '1rem', background: 'rgba(100, 108, 255, 0.1)', borderRadius: '8px', border: '1px solid #646cff' }}>
                  <h4 style={{ textAlign: 'center', marginBottom: '0.75rem', color: '#646cff' }}>🏆 Live Leaderboard 🏆</h4>
                  {leaderboard.map((student, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span>{i + 1}. {student.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{student.score} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
