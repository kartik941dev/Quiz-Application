import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { Check, Code2, Send } from 'lucide-react';

const QuizView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState(null);

  // Diverse inputs state
  const [selectedOption, setSelectedOption] = useState(null); // single_choice & true_false
  const [selectedOptionIndices, setSelectedOptionIndices] = useState([]); // multiple_choice
  const [textResponse, setTextResponse] = useState(''); // fill_in_the_blank & essay_code

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questionStatus, setQuestionStatus] = useState({}); // { [index]: 'answered' | 'skipped' }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestion, setCurrentQuestion] = useState(null);

  const [doubtModalOpen, setDoubtModalOpen] = useState(false);
  const [doubtText, setDoubtText] = useState('');
  const [doubtFeedback, setDoubtFeedback] = useState({ type: '', text: '' });
  const [doubtSubmitting, setDoubtSubmitting] = useState(false);

  useEffect(() => {
    // 1. Fetch Basic Quiz Info
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
    const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const cleanSocketUrl = rawSocketUrl.replace(/\/$/, "");
    const newSocket = io(cleanSocketUrl, { auth: { token } });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-quiz', { quizId: id });
    });

    // 3. Socket Event Listeners
    newSocket.on('question', (data) => {
      setCurrentQuestionIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      setTimeLeft(data.timeLeft || data.question.timeLimit || 0);
      setSelectedOption(null);
      setSelectedOptionIndices([]);
      setTextResponse('');
      setHasSubmitted(false);
      setLeaderboard(null);
    });

    newSocket.on('timer', (data) => {
      setTimeLeft(data.timeLeft);
    });

    newSocket.on('time-up', () => {
      setTimeLeft(0);
      setHasSubmitted(true);
      
      setQuestionStatus(prev => {
        if (prev[currentQuestionIndex] === 'answered') return prev;
        return { ...prev, [currentQuestionIndex]: 'skipped' };
      });
    });

    newSocket.on('progression-mode-updated', (data) => {
      setQuiz(prev => prev ? { ...prev, progressionMode: data.progressionMode } : prev);
    });

    newSocket.on('leaderboard-update', (data) => {
      setLeaderboard(data.leaderboard);
    });

    newSocket.on('quiz-ended', () => {
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
      setCurrentQuestionIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      setTimeLeft(data.timeLeft || 0);
    });

    newSocket.on('rejoin-denied', (data) => {
      alert(data.message || "Rejoin denied.");
      navigate('/student-dashboard');
    });

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
      const msg = err.response?.data?.message || 'Could not submit doubt. Try again.';
      setDoubtFeedback({ type: 'error', text: msg });
    } finally {
      setDoubtSubmitting(false);
    }
  };

  // Single choice / True False submission
  const handleSingleSelect = (index) => {
    if (hasSubmitted || timeLeft === 0) return;
    setSelectedOption(index);
    setHasSubmitted(true);

    if (socket) {
      socket.emit('submit-answer', {
        quizId: id,
        questionIndex: currentQuestionIndex,
        selectedOptionIndex: index
      });
      setQuestionStatus(prev => ({ ...prev, [currentQuestionIndex]: 'answered' }));
    }
  };

  // Multiple choice toggle
  const toggleMultiSelect = (index) => {
    if (hasSubmitted || timeLeft === 0) return;
    setSelectedOptionIndices(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index];
    });
  };

  // Multiple choice submit
  const handleMultiSubmit = () => {
    if (hasSubmitted || timeLeft === 0 || selectedOptionIndices.length === 0) return;
    setHasSubmitted(true);

    if (socket) {
      socket.emit('submit-answer', {
        quizId: id,
        questionIndex: currentQuestionIndex,
        selectedOptionIndices
      });
      setQuestionStatus(prev => ({ ...prev, [currentQuestionIndex]: 'answered' }));
    }
  };

  // Text / Code response submit
  const handleTextSubmit = (e) => {
    if (e) e.preventDefault();
    if (hasSubmitted || timeLeft === 0 || !textResponse.trim()) return;
    setHasSubmitted(true);

    if (socket) {
      socket.emit('submit-answer', {
        quizId: id,
        questionIndex: currentQuestionIndex,
        textResponse: textResponse.trim()
      });
      setQuestionStatus(prev => ({ ...prev, [currentQuestionIndex]: 'answered' }));
    }
  };

  const handleSkip = () => {
    if (hasSubmitted || timeLeft === 0) return;
    setHasSubmitted(true);
    setQuestionStatus(prev => ({ ...prev, [currentQuestionIndex]: 'skipped' }));
  };

  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="loading" style={{ color: 'var(--text-main)', textAlign: 'center', marginTop: '50px' }}>Loading Quiz...</div>;
  if (error) return <div className="error-message" style={{ textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>{error}</div>;

  const totalQuestions = quiz?.questions?.length || 0;
  const qType = currentQuestion?.type || 'single_choice';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem' }}>
      
      {/* Top Banner with Quiz Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #e2e8f0'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#881337',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '0.85rem'
        }}>
          🔍
        </div>
        <h2 style={{
          margin: 0,
          color: '#881337',
          fontSize: '1.4rem',
          fontWeight: 800,
          letterSpacing: '-0.01em'
        }}>
          {quiz?.title || 'Knowledge Assessment Session'}
        </h2>
      </div>

      {/* Main 2-Column CBT Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: '1.5rem',
        alignItems: 'start'
      }}>

        {/* Left Panel: Question Palette & Disclaimer */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
            Total Questions : {totalQuestions}
          </div>

          {/* Number Boxes Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '1.5rem'
          }}>
            {Array.from({ length: totalQuestions }).map((_, idx) => {
              const status = questionStatus[idx];
              const isCurrent = idx === currentQuestionIndex;

              let bgColor = '#f1f5f9';
              let textColor = '#334155';
              let borderColor = '#cbd5e1';

              if (isCurrent) {
                bgColor = '#0284c7';
                textColor = '#ffffff';
                borderColor = '#0369a1';
              } else if (status === 'answered') {
                bgColor = '#0284c7';
                textColor = '#ffffff';
                borderColor = '#0284c7';
              } else if (status === 'skipped') {
                bgColor = '#f59e0b';
                textColor = '#ffffff';
                borderColor = '#d97706';
              }

              return (
                <div
                  key={idx}
                  style={{
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    backgroundColor: bgColor,
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    boxShadow: isCurrent ? '0 0 0 2px rgba(2, 132, 199, 0.25)' : 'none'
                  }}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#475569',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <span>LEGEND :</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#0284c7', borderRadius: '2px' }}></span> ANSWERED
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }}></span> SKIPPED
            </span>
          </div>

          {/* Disclaimer */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            padding: '0.85rem',
            color: '#92400e',
            fontSize: '0.78rem',
            lineHeight: '1.4'
          }}>
            <strong style={{ display: 'block', marginBottom: '4px', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DISCLAIMER</strong>
            Please do not <strong style={{ color: '#dc2626' }}>Close</strong> or <strong style={{ color: '#dc2626' }}>Refresh</strong> this page, otherwise you cannot attempt the quiz again with this session.
          </div>
        </div>

        {/* Right Panel: Active Question / Leaderboard */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '440px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          
          {leaderboard ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.8rem', color: '#0284c7', marginBottom: '1.5rem' }}>🏆 Current Leaderboard</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px', margin: '0 auto' }}>
                {leaderboard.map((student, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '1.05rem', fontWeight: 600 }}>
                    <span>{i + 1}. {student.name}</span>
                    <span style={{ fontWeight: 'bold', color: '#059669' }}>{student.score} pts</span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '2rem', color: '#64748b' }}>Waiting for next question from host...</p>
            </div>
          ) : currentQuestionIndex === -1 || !currentQuestion ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '0.75rem' }}>You're In Session! 🎉</h3>
              <p style={{ color: '#64748b', fontSize: '1rem' }}>Waiting for the host to launch the questions...</p>
            </div>
          ) : (
            <>
              {/* Question Top Bar with Timer & Doubt */}
              <div style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    border: '2px solid #0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: '#0f172a'
                  }}>
                    {currentQuestionIndex + 1}
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>. Question</strong>
                  <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                    {qType === 'multiple_choice' ? 'Multiple Selection' : (qType === 'true_false' ? 'True / False' : (qType === 'fill_in_the_blank' ? 'Fill Blank' : (qType === 'essay_code' ? `Code (${currentQuestion.codeLanguage || 'General'})` : 'Single Choice')))}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={openDoubtModal}
                    style={{
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Raise Doubt
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: timeLeft <= 5 ? '#dc2626' : '#0f172a',
                    fontFamily: 'monospace'
                  }}>
                    <span>⏱</span>
                    <span>{formatTime(timeLeft)}</span>
                  </div>
                </div>
              </div>

              {/* Question Text & Dynamic Response Components */}
              <div style={{ padding: '1.75rem' }}>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  lineHeight: '1.6',
                  marginTop: 0,
                  marginBottom: '1.75rem'
                }}>
                  {qType === 'fill_in_the_blank' ? (
                    (() => {
                      const text = currentQuestion.text || '';
                      if (text.includes('______') || text.includes('[blank]')) {
                        const parts = text.split(/______+|\[blank\]/i);
                        return parts.map((part, pIdx) => (
                          <React.Fragment key={pIdx}>
                            {part}
                            {pIdx < parts.length - 1 && (
                              <span style={{
                                display: 'inline-block',
                                minWidth: '100px',
                                margin: '0 6px',
                                padding: '2px 10px',
                                borderBottom: '2.5px solid var(--primary)',
                                background: 'var(--primary-subtle)',
                                color: textResponse ? 'var(--primary)' : '#94a3b8',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                borderRadius: '4px'
                              }}>
                                {textResponse || '___________'}
                              </span>
                            )}
                          </React.Fragment>
                        ));
                      }
                      return (
                        <span>
                          {text}{' '}
                          <span style={{
                            display: 'inline-block',
                            minWidth: '100px',
                            margin: '0 6px',
                            padding: '2px 10px',
                            borderBottom: '2.5px solid var(--primary)',
                            background: 'var(--primary-subtle)',
                            color: textResponse ? 'var(--primary)' : '#94a3b8',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            borderRadius: '4px'
                          }}>
                            {textResponse || '___________'}
                          </span>
                        </span>
                      );
                    })()
                  ) : (
                    currentQuestion.text
                  )}
                </p>

                {/* 1. Single Choice Radio List */}
                {qType === 'single_choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {currentQuestion.options.map((opt, index) => {
                      const isSelected = selectedOption === index;
                      return (
                        <label
                          key={index}
                          onClick={() => handleSingleSelect(index)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                            background: isSelected ? '#f0f9ff' : '#ffffff',
                            cursor: hasSubmitted || timeLeft === 0 ? 'default' : 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="radio"
                            name="quiz-single-option"
                            checked={isSelected}
                            readOnly
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#0284c7'
                            }}
                          />
                          <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: isSelected ? 600 : 400 }}>
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 2. Multiple Choice Checkboxes */}
                {qType === 'multiple_choice' && (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                      {currentQuestion.options.map((opt, index) => {
                        const isSelected = selectedOptionIndices.includes(index);
                        return (
                          <div
                            key={index}
                            onClick={() => toggleMultiSelect(index)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              padding: '0.85rem 1rem',
                              borderRadius: '6px',
                              border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                              background: isSelected ? '#f0f9ff' : '#ffffff',
                              cursor: hasSubmitted || timeLeft === 0 ? 'default' : 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: isSelected ? '2px solid #0284c7' : '2px solid #cbd5e1',
                              background: isSelected ? '#0284c7' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              {isSelected && '✓'}
                            </div>
                            <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: isSelected ? 600 : 400 }}>
                              {opt}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {!hasSubmitted && (
                      <button
                        type="button"
                        className="btn"
                        onClick={handleMultiSubmit}
                        disabled={selectedOptionIndices.length === 0 || timeLeft === 0}
                        style={{ width: 'auto', padding: '0.65rem 1.75rem', fontWeight: 600 }}
                      >
                        Submit Selected Answers ({selectedOptionIndices.length})
                      </button>
                    )}
                  </div>
                )}

                {/* 3. True / False Large Buttons */}
                {qType === 'true_false' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => handleSingleSelect(0)}
                      disabled={hasSubmitted || timeLeft === 0}
                      style={{
                        padding: '1.25rem',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: hasSubmitted || timeLeft === 0 ? 'default' : 'pointer',
                        border: selectedOption === 0 ? '2.5px solid #059669' : '1px solid #e2e8f0',
                        background: selectedOption === 0 ? '#ecfdf5' : '#ffffff',
                        color: selectedOption === 0 ? '#065f46' : '#1e293b',
                        boxShadow: selectedOption === 0 ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✓ True
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSingleSelect(1)}
                      disabled={hasSubmitted || timeLeft === 0}
                      style={{
                        padding: '1.25rem',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: hasSubmitted || timeLeft === 0 ? 'default' : 'pointer',
                        border: selectedOption === 1 ? '2.5px solid #dc2626' : '1px solid #e2e8f0',
                        background: selectedOption === 1 ? '#fef2f2' : '#ffffff',
                        color: selectedOption === 1 ? '#991b1b' : '#1e293b',
                        boxShadow: selectedOption === 1 ? '0 4px 12px rgba(220, 38, 38, 0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✕ False
                    </button>
                  </div>
                )}

                {/* 4. Fill in the Blank Input */}
                {qType === 'fill_in_the_blank' && (
                  <div style={{ maxWidth: '560px' }}>
                    <form onSubmit={handleTextSubmit}>
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type your fill-in-the-blank answer..."
                          value={textResponse}
                          onChange={e => setTextResponse(e.target.value)}
                          disabled={hasSubmitted || timeLeft === 0}
                          style={{ fontSize: '1.05rem', padding: '0.75rem 1rem', border: hasSubmitted ? '1.5px solid #10b981' : '1px solid #cbd5e1' }}
                          autoFocus
                        />
                        {!hasSubmitted && (
                          <button
                            type="submit"
                            className="btn"
                            disabled={!textResponse.trim() || timeLeft === 0}
                            style={{ width: 'auto', padding: '0.75rem 1.75rem', fontWeight: 700 }}
                          >
                            Submit Answer
                          </button>
                        )}
                      </div>
                    </form>

                    {hasSubmitted && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.92rem',
                        fontWeight: 600
                      }}>
                        <span>✅ Answer Submitted:</span>
                        <span style={{ color: '#047857', background: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #6ee7b7' }}>
                          "{textResponse}"
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#059669', marginLeft: 'auto', fontWeight: 500 }}>
                          (Awaiting next question)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Formatted Code Editor / Essay Area */}
                {qType === 'essay_code' && (
                  <form onSubmit={handleTextSubmit}>
                    <div style={{
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      overflow: 'hidden',
                      marginBottom: '1rem',
                      background: '#0f172a'
                    }}>
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                        color: '#94a3b8',
                        fontFamily: 'monospace'
                      }}>
                        <Code2 size={14} />
                        <span>Language: {currentQuestion.codeLanguage || 'general'}</span>
                      </div>
                      <textarea
                        rows={8}
                        value={textResponse}
                        onChange={e => setTextResponse(e.target.value)}
                        disabled={hasSubmitted || timeLeft === 0}
                        placeholder="Write your code or essay answer here..."
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'transparent',
                          color: '#f8fafc',
                          fontFamily: 'monospace',
                          fontSize: '0.95rem',
                          lineHeight: '1.5',
                          border: 'none',
                          outline: 'none',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    {!hasSubmitted && (
                      <button
                        type="submit"
                        className="btn"
                        disabled={!textResponse.trim() || timeLeft === 0}
                        style={{ width: 'auto', padding: '0.75rem 1.75rem', fontWeight: 600 }}
                      >
                        <Send size={15} /> Submit Response
                      </button>
                    )}
                  </form>
                )}

                {hasSubmitted && timeLeft > 0 && (
                  <div style={{ marginTop: '1.5rem', color: '#059669', fontSize: '0.95rem', fontWeight: 600 }}>
                    ✓ Response locked in. Waiting for question time to finish...
                  </div>
                )}

                {timeLeft === 0 && (
                  <div style={{ marginTop: '1.5rem', color: '#b45309', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⏳</span>
                    <span>
                      {quiz?.progressionMode === 'manual'
                        ? "Time's up for this question. Waiting for host to launch the next question..."
                        : "Time's up! Advancing to next question..."}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Action Footer Bar */}
              <div style={{
                background: '#0f766e',
                padding: '0.75rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={hasSubmitted || timeLeft === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: '#ffffff',
                    padding: '0.45rem 1.25rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: hasSubmitted || timeLeft === 0 ? 'not-allowed' : 'pointer',
                    opacity: hasSubmitted || timeLeft === 0 ? 0.6 : 1
                  }}
                >
                  Skip
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      padding: '0.45rem 1.25rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={timeLeft === 0}
                    style={{
                      background: '#ffffff',
                      border: 'none',
                      color: '#0f766e',
                      padding: '0.45rem 1.25rem',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

      </div>

      {/* Doubt Modal */}
      {doubtModalOpen && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
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
            style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="doubt-modal-title" style={{ marginTop: 0, color: 'var(--text-main)' }}>
              Raise a Doubt {currentQuestionIndex >= 0 ? `(Question ${currentQuestionIndex + 1})` : ''}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 0 }}>
              Describe what is unclear. Your teacher can review this during or after the session.
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
                      doubtFeedback.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
                    color: doubtFeedback.type === 'success' ? 'var(--status-success-text)' : 'var(--status-error-text)',
                    border: `1px solid ${doubtFeedback.type === 'success' ? 'var(--status-success-border)' : 'var(--status-error-border)'}`
                  }}
                >
                  {doubtFeedback.text}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-neutral" onClick={closeDoubtModal} disabled={doubtSubmitting} style={{ width: 'auto' }}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={doubtSubmitting} style={{ width: 'auto' }}>
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
