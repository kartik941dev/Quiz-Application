import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Doubts Modal State
  const [doubtsModalQuiz, setDoubtsModalQuiz] = useState(null);
  const [doubtsList, setDoubtsList] = useState([]);
  const [doubtsLoading, setDoubtsLoading] = useState(false);
  const [doubtsError, setDoubtsError] = useState('');

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quiz/my-quizzes');
      setQuizzes(res.data.quizzes);
    } catch (err) {
      console.error(err);
      setStatusMsg('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDuplicate = async (quizId) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/quiz/${quizId}/full`);
      const fullQuiz = res.data.quiz;
      // Navigate to create page with prefilled duplicate state
      navigate('/create-quiz', { state: { duplicateQuiz: fullQuiz } });
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
      fetchQuizzes();
    } catch (err) {
      console.error('Failed to close quiz', err);
      setStatusMsg(`❌ Error: ${err.response?.data?.message || 'Failed to close quiz'}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      
      {/* Top Header with Create Quiz Action */}
      <div style={{ maxWidth: '900px', margin: '0 auto 1.75rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.85rem' }}>My Quizzes</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Manage, host live sessions, and analyze previous assessments
          </p>
        </div>

        <button 
          type="button" 
          className="btn" 
          onClick={() => navigate('/create-quiz')}
          style={{ width: 'auto', padding: '0.65rem 1.25rem', fontSize: '0.92rem', fontWeight: 600 }}
        >
          <span>+</span> Create New Quiz
        </button>
      </div>

      {statusMsg && (
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto 1.5rem auto', 
          padding: '0.85rem 1.25rem', 
          borderRadius: 'var(--radius-md)', 
          background: statusMsg.startsWith('✅') ? 'var(--status-success-bg)' : 'var(--status-error-bg)', 
          color: statusMsg.startsWith('✅') ? 'var(--status-success-text)' : 'var(--status-error-text)',
          border: `1px solid ${statusMsg.startsWith('✅') ? 'var(--status-success-border)' : 'var(--status-error-border)'}`
        }}>
          {statusMsg}
        </div>
      )}

      {/* Quizzes List Container */}
      <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading previous quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📚</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No quizzes found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              You haven't created any quizzes yet. Click "Create New Quiz" to get started.
            </p>
            <button 
              type="button" 
              className="btn" 
              onClick={() => navigate('/create-quiz')} 
              style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
            >
              + Create Your First Quiz
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {quizzes.map(q => (
              <div 
                key={q._id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '1rem', 
                  background: 'var(--bg-card-subtle)', 
                  padding: '1.25rem 1.5rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-subtle)',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)', fontSize: '1.15rem' }}>{q.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Code:</span>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--primary)', 
                        background: 'var(--primary-subtle)', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--primary-border)', 
                        fontFamily: 'monospace', 
                        letterSpacing: '1.5px',
                        fontWeight: 700
                      }}>
                        {q.joinCode}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Questions: {q.questions?.length || 0}
                    </span>

                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {!q.isClosed ? (
                    <button className="btn" onClick={() => navigate(`/teacher-live/${q._id}`)} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.88rem' }}>
                      Go Live
                    </button>
                  ) : (
                    <div style={{ background: '#f1f5f9', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', fontWeight: '600', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                      CLOSED
                    </div>
                  )}
                  {!q.isClosed && (
                    <button 
                      type="button" 
                      className="btn btn-neutral" 
                      onClick={() => navigate(`/edit-quiz/${q._id}`)} 
                      style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.88rem' }}
                      title="Edit questions, time limits, and student reattempt settings"
                    >
                      Edit
                    </button>
                  )}
                  <button type="button" className="btn btn-neutral" onClick={() => navigate(`/analytics/${q._id}`)} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.88rem' }}>
                    Analytics
                  </button>
                  <button type="button" className="btn btn-neutral" onClick={() => openDoubtsForQuiz(q)} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.88rem' }}>
                    Doubts
                  </button>
                  <button type="button" className="btn btn-neutral" onClick={() => handleDuplicate(q._id)} disabled={isLoading} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.88rem' }}>
                    Duplicate
                  </button>
                  {!q.isClosed && (
                    <button type="button" className="btn btn-danger-outline" onClick={() => handleCloseQuiz(q._id)} disabled={isLoading} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.88rem' }}>
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doubts Modal */}
      {doubtsModalQuiz && (
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
          onClick={closeDoubtsModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doubts-modal-title"
            className="glass-card"
            style={{ maxWidth: '640px', width: '100%', maxHeight: '85vh', overflow: 'auto', padding: '1.75rem', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 id="doubts-modal-title" style={{ margin: 0, color: 'var(--text-main)' }}>
                  Student Doubts
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                  {doubtsModalQuiz.title}
                </p>
              </div>
              <button type="button" className="btn btn-neutral" onClick={closeDoubtsModal} style={{ width: 'auto', padding: '0.4rem 0.85rem' }}>
                Close
              </button>
            </div>

            {doubtsLoading && <p style={{ color: 'var(--text-muted)' }}>Loading doubts…</p>}
            {doubtsError && <div className="error-message">{doubtsError}</div>}

            {!doubtsLoading && !doubtsError && doubtsList.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No doubts raised for this quiz yet.
              </p>
            )}

            {!doubtsLoading && doubtsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {doubtsList.map((d) => (
                  <div
                    key={d._id}
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ color: 'var(--text-main)' }}>
                        Question {d.questionIndex + 1}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(d.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: '0.5rem 0', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}>
                      {d.doubtText}
                    </p>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Student: {d.studentId?.name || 'Anonymous'} ({d.studentId?.email || 'N/A'})
                    </div>
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
