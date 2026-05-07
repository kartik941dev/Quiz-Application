import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';

const QuizView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questionStatus, setQuestionStatus] = useState({}); // { [index]: 'answered' | 'missed' }


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestion, setCurrentQuestion] = useState(null);

  const [doubtModalOpen, setDoubtModalOpen] = useState(false);
  const [doubtText, setDoubtText] = useState('');
  const [doubtFeedback, setDoubtFeedback] = useState({ type: '', text: '' });
  const [doubtSubmitting, setDoubtSubmitting] = useState(false);

  useEffect(() => {
    // 1. Fetch Basic Quiz Info (Title, total questions count)
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/quiz/${id}`);
        setQuiz(res.data.quiz);
      } catch (err) {
        setError('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();

    // 2. Connect Socket
    const token = localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const newSocket = io(socketUrl, { auth: { token } });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-quiz', { quizId: id });
    });

    // 3. Socket Event Listeners
    
    // NEW: Listen for the full question payload
    newSocket.on('question', (data) => {
      setCurrentQuestionIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      setTimeLeft(data.timeLeft || data.question.timeLimit || 0);
      setSelectedOption(null);
      setHasSubmitted(false);
      setLeaderboard(null); // Hide leaderboard when new question starts
    });

    newSocket.on('timer', (data) => {
      setTimeLeft(data.timeLeft);
    });

    newSocket.on('time-up', () => {
      setTimeLeft(0);
      setHasSubmitted(true); // Lock selections / Auto Submit
      
      setQuestionStatus(prev => {
        // Only mark as missed if it hasn't been answered yet
        if (prev[currentQuestionIndex] === 'answered') return prev;
        return { ...prev, [currentQuestionIndex]: 'missed' };
      });
    });

    newSocket.on('leaderboard-update', (data) => {
      setLeaderboard(data.leaderboard);
    });

    newSocket.on('quiz-ended', () => {
      // Redirect to results page when teacher ends the quiz
      navigate(`/results/${id}`);
    });

    newSocket.on('broadcast-message', (data) => {
      alert(`📢 Announcement: ${data.message}`);
    });

    newSocket.on('removed-from-quiz', (data) => {
      alert(data.message);
      navigate('/student-dashboard');
    });

    newSocket.on('restore-state', (data) => {
      console.log('Restoring state:', data);
      setCurrentQuestionIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      setTimeLeft(data.timeLeft || 0);
    });

    newSocket.on('rejoin-denied', (data) => {
      alert(data.message || "Rejoin denied. You may have exceeded the time limit or attempt count.");
      navigate('/student-dashboard');
    });

    // Anti-Cheating: Tab Switch Detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        newSocket.emit('tab-switch', { quizId: id });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      newSocket.disconnect();
    };
  }, [id, navigate]);

  const openDoubtModal = () => {
    setDoubtFeedback({ type: '', text: '' });
    setDoubtText('');
    setDoubtModalOpen(true);
  };

  const closeDoubtModal = () => {
    if (doubtSubmitting) return;
    setDoubtModalOpen(false);
    setDoubtText('');
    setDoubtFeedback({ type: '', text: '' });
  };

  const submitDoubt = async (e) => {
    e.preventDefault();
    const trimmed = doubtText.trim();
    if (!trimmed) {
      setDoubtFeedback({ type: 'error', text: 'Please describe your doubt.' });
      return;
    }
    if (currentQuestionIndex < 0) {
      setDoubtFeedback({ type: 'error', text: 'No active question to attach this doubt to.' });
      return;
    }
    setDoubtSubmitting(true);
    setDoubtFeedback({ type: '', text: '' });
    try {
      await api.post('/doubts', {
        quizId: id,
        questionIndex: currentQuestionIndex,
        doubtText: trimmed
      });
      setDoubtFeedback({ type: 'success', text: 'Your doubt was sent to the teacher.' });
      setDoubtText('');
      setTimeout(() => {
        setDoubtModalOpen(false);
        setDoubtFeedback({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Could not submit doubt. Try again.';
      setDoubtFeedback({ type: 'error', text: msg });
    } finally {
      setDoubtSubmitting(false);
    }
  };

  const handleOptionSelect = (index) => {
    if (hasSubmitted || timeLeft === 0) return; // Prevent changing after submission/timeup
    setSelectedOption(index);
    setHasSubmitted(true);

    // Transmit instantly to server memory
    if (socket) {
      socket.emit('submit-answer', {
        quizId: id,
        questionIndex: currentQuestionIndex,
        selectedOptionIndex: index
      });
      setQuestionStatus(prev => ({ ...prev, [currentQuestionIndex]: 'answered' }));
    }
  };

  if (loading) return <div className="loading" style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Loading Quiz...</div>;
  if (error) return <div className="error-message" style={{ color: '#ff4a4a', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-card" style={{ position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{quiz.title}</h2>
          {currentQuestionIndex >= 0 && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={openDoubtModal}
                style={{ width: 'auto', background: 'rgba(255, 193, 7, 0.25)', color: '#ffc107', border: '1px solid rgba(255, 193, 7, 0.4)', marginTop: 0 }}
              >
                Raise Doubt
              </button>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 5 ? '#ff4a4a' : 'white' }}>
                ⏳ {timeLeft}s
              </span>
              <span style={{ 
                background: 'rgba(59, 130, 246, 0.2)', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                color: '#3b82f6', 
                fontWeight: 'bold',
                border: '1px solid rgba(59, 130, 246, 0.4)'
              }}>
                Q {currentQuestionIndex + 1} / {quiz.questions.length} ({currentQuestion?.marks || 1} M)
              </span>
            </div>
          )}
        </div>

        {/* Question Palette */}
        {currentQuestionIndex >= 0 && !leaderboard && (
          <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Question Palette</p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, 40px)', 
              gap: '10px',
              justifyContent: 'center'
            }}>
              {quiz.questions.map((_, idx) => {
                const status = questionStatus[idx];
                const isCurrent = idx === currentQuestionIndex;
                
                let bgColor = '#1e293b';
                if (status === 'answered') bgColor = '#22c55e';
                else if (status === 'missed') bgColor = '#ef4444';

                return (
                  <div 
                    key={idx}
                    className="question-box"
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      backgroundColor: bgColor,
                      color: 'white',
                      border: isCurrent ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease',
                      fontSize: '0.9rem',
                      boxShadow: isCurrent ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                    }}
                  >
                    {idx + 1}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Content */}
        {leaderboard ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2rem', color: '#646cff', marginBottom: '2rem' }}>🏆 Leaderboard 🏆</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
              {leaderboard.map((student, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '1.2rem' }}>
                  <span>{i + 1}. {student.name}</span>
                  <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{student.score}</span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.5)' }}>Waiting for next question...</p>
          </div>
        ) : currentQuestionIndex === -1 || !currentQuestion ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>You're in! 🎉</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>Look at the projector. Waiting for the teacher to start...</p>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
              {currentQuestion.text}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {currentQuestion.options.map((opt, index) => {
                const labels = ["A", "B", "C", "D"];
                const isSelected = selectedOption === index;
                return (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    disabled={hasSubmitted || timeLeft === 0}
                    style={{
                      padding: '2rem',
                      fontSize: '1.2rem',
                      background: isSelected ? '#646cff' : 'rgba(0,0,0,0.2)',
                      border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      cursor: hasSubmitted || timeLeft === 0 ? 'not-allowed' : 'pointer',
                      color: 'white',
                      transition: 'all 0.2s',
                      opacity: hasSubmitted && !isSelected ? 0.5 : 1,
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <strong style={{ marginRight: '1rem', color: isSelected ? 'white' : '#646cff', fontSize: '1.5rem' }}>{labels[index]}</strong>
                    {opt}
                  </button>
                );
              })}
            </div>

            {hasSubmitted && (
              <div style={{ textAlign: 'center', marginTop: '2rem', color: '#4caf50', fontWeight: 'bold' }}>
                Answer locked in! Waiting for time to expire...
              </div>
            )}
          </div>
        )}
      </div>

      {doubtModalOpen && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={closeDoubtModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doubt-modal-title"
            className="glass-card"
            style={{ maxWidth: '480px', width: '100%', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="doubt-modal-title" style={{ marginTop: 0, color: 'white' }}>
              Raise a doubt {currentQuestionIndex >= 0 ? `(Question ${currentQuestionIndex + 1})` : ''}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', marginTop: 0 }}>
              Describe what is unclear. Your teacher can review this after or during the session.
            </p>
            <form onSubmit={submitDoubt}>
              <textarea
                className="form-control"
                value={doubtText}
                onChange={(e) => setDoubtText(e.target.value)}
                placeholder="What would you like to ask?"
                rows={5}
                disabled={doubtSubmitting}
                style={{ width: '100%', resize: 'vertical', marginBottom: '1rem' }}
              />
              {doubtFeedback.text && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background:
                      doubtFeedback.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                    color: 'white'
                  }}
                >
                  {doubtFeedback.text}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={closeDoubtModal} disabled={doubtSubmitting} style={{ width: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={doubtSubmitting} style={{ width: 'auto', background: '#646cff' }}>
                  {doubtSubmitting ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizView;
