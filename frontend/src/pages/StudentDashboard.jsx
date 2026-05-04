import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/student/dashboard-stats');
        if (res.data.success) {
          console.log('[DEBUG] Attempts found:', res.data.stats.attempts);
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/quiz/join', { joinCode });
      if (res.data.success) {
        navigate(`/quiz/${res.data.quizId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join quiz');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header removed in favor of global Navbar */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Stats Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Quizzes Taken</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{stats?.totalQuizzes || 0}</p>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
              <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Avg. Accuracy</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#646cff' }}>{stats?.avgScore || 0}%</p>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔝</div>
              <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Best Score</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#4caf50' }}>{stats?.bestScore || 0}%</p>
            </div>
          </div>

          {/* History */}
          <div className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>🕒</span> Attempt History
            </h3>
            {loadingStats ? (
              <p>Loading your history...</p>
            ) : stats?.attempts.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>No quizzes attempted yet. Join one to get started!</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>Quiz</th>
                      <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>Score</th>
                      <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>Accuracy</th>
                      <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.attempts.map((attempt) => (
                      <tr key={attempt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{attempt.quizTitle}</td>
                        <td style={{ padding: '1rem' }}>{attempt.score} / {attempt.totalQuestions}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.85rem',
                            background: parseFloat(attempt.percentage) >= 70 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                            color: parseFloat(attempt.percentage) >= 70 ? '#4caf50' : '#ff9800'
                          }}>
                            {attempt.percentage}%
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                          {new Date(attempt.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>🏅</span> Achievements
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {stats?.badges.map((badge) => (
                <div key={badge.id} style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{ fontSize: '2rem' }}>{badge.icon}</div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{badge.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{badge.description}</div>
                  </div>
                </div>
              ))}
              {stats?.badges.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Earn badges by completing quizzes!</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Join Quiz */}
          <div className="glass-card" style={{ border: '2px solid rgba(100, 108, 255, 0.3)' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center' }}>Enter Join Code</h3>
            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            
            <form onSubmit={handleJoin}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px', fontWeight: 'bold' }}
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={isLoading || joinCode.length !== 6}>
                {isLoading ? 'Joining...' : 'Join Live Quiz'}
              </button>
            </form>
          </div>

          {/* Global Leaderboard */}
          <div className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.2rem', textAlign: 'center' }}>🏆 Global Ranking</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats?.leaderboard.map((student, index) => (
                <div key={student._id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem', 
                  background: student._id === user?.userId ? 'rgba(100, 108, 255, 0.2)' : 'rgba(0,0,0,0.2)', 
                  borderRadius: '8px',
                  border: student._id === user?.userId ? '1px solid rgba(100, 108, 255, 0.5)' : '1px solid transparent',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ color: index < 3 ? '#ffc107' : 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>#{index + 1}</span>
                    <span style={{ fontWeight: student._id === user?.userId ? 'bold' : 'normal' }}>{student.name}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{student.totalScore} pts</span>
                </div>
              ))}
              {stats?.leaderboard.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.8rem' }}>Leaderboard loading...</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
