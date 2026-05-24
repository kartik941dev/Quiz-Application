import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useRef } from 'react';

const TeacherDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [leaderboardInterval, setLeaderboardInterval] = useState(1);
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correctOptionIndex: 0, timeLimit: 30, explanation: '', marks: 1, negativeMarks: 0 }
  ]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [negativeEnabled, setNegativeEnabled] = useState(false);
  const [negativeValue, setNegativeValue] = useState(0.25);
  const formRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctOptionIndex: 0, timeLimit: 30, explanation: '', marks: 1, negativeMarks: 0 }]);
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMsg('');

    try {
      const res = await api.post('/quiz', {
        title,
        leaderboardInterval: Number(leaderboardInterval),
        questions: questions.map(q => ({
          ...q,
          correctOptionIndex: Number(q.correctOptionIndex),
          timeLimit: Number(q.timeLimit),
          marks: Number(q.marks),
          negativeMarks: Number(q.negativeMarks)
        })),
        negativeMarkingEnabled: negativeEnabled
      });
      
      setStatusMsg(`✅ Success! Quiz "${res.data.quiz.title}" stored in DB. Join Code: ${res.data.quiz.joinCode}`);
      // Reset form
      setTitle('');
      setLeaderboardInterval(1);
      setQuestions([{ text: '', options: ['', '', '', ''], correctOptionIndex: 0, timeLimit: 30, explanation: '', marks: 1, negativeMarks: 0 }]);
    } catch (err) {
      setStatusMsg(`❌ Error: ${err.response?.data?.message || 'Network error: Could not connect to backend server'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (quizId) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/quiz/${quizId}/full`);
      const fullQuiz = res.data.quiz;

      // Prefill form
      setTitle(`${fullQuiz.title} (Copy)`);
      setLeaderboardInterval(fullQuiz.leaderboardInterval);
      setNegativeEnabled(fullQuiz.negativeMarkingEnabled);
      setQuestions(fullQuiz.questions.map(q => ({
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        timeLimit: q.timeLimit,
        explanation: q.explanation || '',
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0
      })));

      // Scroll to form
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
      setStatusMsg('📋 Quiz data copied to form. You can edit it now before saving.');
    } catch (err) {
      console.error('Failed to duplicate quiz', err);
      setStatusMsg('❌ Failed to fetch quiz details for duplication');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCloseQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY close this quiz? This action cannot be undone and no students will be able to join or host this quiz again.")) {
      return;
    }

    try {
      setIsLoading(true);
      await api.patch(`/quiz/${quizId}/close`);
      setStatusMsg('✅ Quiz permanently closed successfully.');
      // Refetch quizzes to update UI
      const res = await api.get('/quiz/my-quizzes');
      setQuizzes(res.data.quizzes);
    } catch (err) {
      console.error('Failed to close quiz', err);
      setStatusMsg(`❌ Error: ${err.response?.data?.message || 'Failed to close quiz'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const [quizzes, setQuizzes] = useState([]);
  const [doubtsModalQuiz, setDoubtsModalQuiz] = useState(null);
  const [doubtsList, setDoubtsList] = useState([]);
  const [doubtsLoading, setDoubtsLoading] = useState(false);
  const [doubtsError, setDoubtsError] = useState('');

  const openDoubtsForQuiz = async (quiz) => {
    setDoubtsModalQuiz(quiz);
    setDoubtsList([]);
    setDoubtsError('');
    setDoubtsLoading(true);
    try {
      const res = await api.get(`/doubts/${quiz._id}`);
      setDoubtsList(res.data.doubts || []);
    } catch (err) {
      setDoubtsError(err.response?.data?.message || err.response?.data?.error || 'Failed to load doubts');
    } finally {
      setDoubtsLoading(false);
    }
  };

  const closeDoubtsModal = () => {
    setDoubtsModalQuiz(null);
    setDoubtsList([]);
    setDoubtsError('');
  };

  React.useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get('/quiz/my-quizzes');
        setQuizzes(res.data.quizzes);
      } catch (err) {
        console.error(err);
      }
    };
    fetchQuizzes();
  }, [statusMsg]);

  React.useEffect(() => {
    const target = sessionStorage.getItem('scrollTarget');
    if (target) {
      sessionStorage.removeItem('scrollTarget');
      setTimeout(() => {
        if (target === 'create') {
          formRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (target === 'quizzes') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 500);
    }
  }, []);

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      {/* Header removed in favor of global Navbar */}

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto 2rem auto', width: '100%' }}>
        <h3 style={{ marginTop: 0, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>My Quizzes</h3>
        {quizzes.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>No quizzes created yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {quizzes.map(q => (
              <div key={q._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{q.title}</h4>
                  <small style={{ color: '#4caf50', letterSpacing: '2px' }}>Code: {q.joinCode}</small>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {!q.isClosed ? (
                    <button className="btn" onClick={() => navigate(`/teacher-live/${q._id}`)} style={{ flex: '1 0 100px', padding: '0.5rem' }}>
                      Go Live
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      CLOSED
                    </div>
                  )}
                  <button className="btn" onClick={() => navigate(`/analytics/${q._id}`)} style={{ flex: '1 0 100px', padding: '0.5rem', background: '#4caf50' }}>
                    Analytics
                  </button>
                  <button type="button" className="btn" onClick={() => openDoubtsForQuiz(q)} style={{ flex: '1 0 100px', padding: '0.5rem', background: 'rgba(255, 193, 7, 0.25)', color: '#ffc107', border: '1px solid rgba(255, 193, 7, 0.4)' }}>
                    View Doubts
                  </button>
                  <button type="button" className="btn" onClick={() => handleDuplicate(q._id)} style={{ flex: '1 0 100px', padding: '0.5rem', background: 'rgba(100, 108, 255, 0.2)', border: '1px solid rgba(100, 108, 255, 0.4)' }}>
                    Duplicate
                  </button>
                  {!q.isClosed && (
                    <button type="button" className="btn" onClick={() => handleCloseQuiz(q._id)} style={{ flex: '1 0 150px', padding: '0.5rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}>
                      Close Permanently
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card" ref={formRef} style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h3 style={{ marginTop: 0, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>Create New Quiz</h3>
        
        {statusMsg && (
          <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '8px', background: statusMsg.startsWith('✅') ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)', color: 'white' }}>
            {statusMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label>Quiz Title</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Midterm Physics"
              />
            </div>
            <div style={{ width: '200px' }}>
              <label>Leaderboard Interval</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={leaderboardInterval}
                onChange={(e) => setLeaderboardInterval(e.target.value)}
                required
              />
              <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Show every N questions</small>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'rgba(255, 74, 74, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 74, 74, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input 
                type="checkbox" 
                id="negMarking" 
                checked={negativeEnabled} 
                onChange={(e) => setNegativeEnabled(e.target.checked)} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="negMarking" style={{ cursor: 'pointer', fontWeight: 'bold' }}>Enable Negative Marking</label>
            </div>
            
            {negativeEnabled && (
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                💡 You can now set individual negative marks for each question below.
              </div>
            )}
          </div>

          <h4 style={{ color: 'white', marginTop: '2rem' }}>Questions</h4>
          
          {questions.map((q, qIndex) => (
            <div key={qIndex} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <strong style={{ color: '#646cff' }}>Question {qIndex + 1}</strong>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(qIndex)} style={{ background: 'transparent', border: 'none', color: '#ff4a4a', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  className="form-control"
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                  required
                  placeholder="Enter question text"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctOptionIndex === oIndex}
                      onChange={() => handleQuestionChange(qIndex, 'correctOptionIndex', oIndex)}
                      required
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={opt}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                      required
                      placeholder={`Option ${oIndex + 1}`}
                      style={{ padding: '0.5rem' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ width: '150px' }}>
                  <label>Marks (+)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={q.marks}
                    onChange={(e) => handleQuestionChange(qIndex, 'marks', e.target.value)}
                    required
                  />
                </div>

                {negativeEnabled && (
                  <div className="form-group" style={{ width: '150px' }}>
                    <label>Negative Marks (-)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      className="form-control"
                      value={q.negativeMarks}
                      onChange={(e) => handleQuestionChange(qIndex, 'negativeMarks', e.target.value)}
                      required
                      style={{ color: '#ff4a4a' }}
                    />
                  </div>
                )}

                <div className="form-group" style={{ width: '200px' }}>
                  <label>Time Limit (Seconds)</label>
                  <input
                    type="number"
                    min="5"
                    className="form-control"
                    value={q.timeLimit}
                    onChange={(e) => handleQuestionChange(qIndex, 'timeLimit', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Explanation (Optional, shown after quiz)</label>
                <textarea
                  className="form-control"
                  value={q.explanation}
                  onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                  placeholder="Explain why the answer is correct..."
                  rows="2"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          ))}

          <button type="button" onClick={addQuestion} className="btn" style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.3)', marginBottom: '2rem' }}>
            + Add Another Question
          </button>

          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Quiz to Database'}
          </button>
        </form>
      </div>

      {doubtsModalQuiz && (
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
          onClick={closeDoubtsModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doubts-modal-title"
            className="glass-card"
            style={{ maxWidth: '640px', width: '100%', maxHeight: '85vh', overflow: 'auto', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 id="doubts-modal-title" style={{ margin: 0, color: 'white' }}>
                  View Doubts
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
                  {doubtsModalQuiz.title}
                </p>
              </div>
              <button type="button" className="btn" onClick={closeDoubtsModal} style={{ width: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', marginTop: 0 }}>
                Close
              </button>
            </div>

            {doubtsLoading && <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading doubts…</p>}
            {doubtsError && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(244, 67, 54, 0.2)', color: 'white', marginBottom: '1rem' }}>
                {doubtsError}
              </div>
            )}
            {!doubtsLoading && !doubtsError && doubtsList.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>No doubts submitted for this quiz yet.</p>
            )}
            {!doubtsLoading && doubtsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {doubtsList.map((d) => (
                  <div
                    key={d._id}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#646cff' }}>Question {(d.questionIndex ?? 0) + 1}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        {d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.5rem', color: 'white', whiteSpace: 'pre-wrap' }}>{d.doubtText}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)' }}>
                      <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Student:</strong>{' '}
                      {d.studentId?.name || 'Unknown'}
                      {d.studentId?.email ? ` · ${d.studentId.email}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
