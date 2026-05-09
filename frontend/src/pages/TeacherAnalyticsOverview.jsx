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
        <h2 style={{ fontSize: '2rem', color: '#646cff' }}>📊 Analytics Overview</h2>
        <button className="btn" onClick={() => navigate('/teacher-dashboard')} style={{ width: 'auto', background: 'rgba(255,255,255,0.1)' }}>Back to Dashboard</button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="glass-card">
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'white' }}>Select a Quiz to View Analytics</h3>
        
        {quizzes.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>You haven't created any quizzes yet.</p>
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
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(100, 108, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(100, 108, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'white' }}>{quiz.title}</h4>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      📅 Created: {new Date(quiz.createdAt).toLocaleDateString()}
                    </span>
                    {quiz.isClosed && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 6px', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>CLOSED</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Join Code</div>
                    <div style={{ fontWeight: 'bold', color: '#646cff', letterSpacing: '1px' }}>{quiz.joinCode}</div>
                  </div>
                  <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.3)' }}>➡️</span>
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
