import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TeacherAnalyticsOverview = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get('/quiz/my-quizzes');
        setQuizzes(res.data.quizzes);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  if (loading) return <div className="loading" style={{ textAlign: 'center', marginTop: '50px', color: 'white' }}>Loading Quizzes...</div>;

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.85rem', color: 'var(--text-main)', margin: 0 }}>Analytics Overview</h2>
        <button type="button" className="btn btn-neutral" onClick={() => navigate('/teacher-dashboard')} style={{ width: 'auto', fontSize: '0.88rem' }}>Back to Dashboard</button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="glass-card">
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>Select a Quiz to View Analytics</h3>
        
        {quizzes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>You haven't created any quizzes yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {quizzes.map((quiz) => (
              <div 
                key={quiz._id} 
                className="quiz-list-item"
                onClick={() => navigate(`/analytics/${quiz._id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>{quiz.title}</h4>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      📅 Created: {new Date(quiz.createdAt).toLocaleDateString()}
                    </span>
                    {quiz.isClosed && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 6px', 
                        background: '#f1f5f9', 
                        color: 'var(--text-dim)', 
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>CLOSED</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Join Code</div>
                    <div style={{ 
                      fontWeight: '700', 
                      color: 'var(--primary)', 
                      background: 'var(--primary-subtle)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--primary-border)',
                      fontFamily: 'monospace',
                      letterSpacing: '1.5px',
                      fontSize: '0.88rem'
                    }}>
                      {quiz.joinCode}
                    </div>
                  </div>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAnalyticsOverview;
