import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load stats', err);
        setError('Network error: Could not connect to backend server');
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
      setError(err.response?.data?.message || 'Network error: Could not connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Stats Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Quizzes Taken</h4>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0.4rem 0 0 0', color: 'var(--text-main)' }}>{stats?.totalQuizzes || 0}</p>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Avg. Accuracy</h4>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0.4rem 0 0 0', color: (stats?.avgScore || 0) >= 60 ? '#059669' : '#d97706' }}>
                {stats?.avgScore || 0}%
              </p>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Best Score</h4>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0.4rem 0 0 0', color: 'var(--primary)' }}>
                {stats?.bestScore || 0}%
              </p>
            </div>
          </div>

          {/* Accuracy Progress Chart */}
          {stats?.accuracyHistory && stats.accuracyHistory.length > 1 && (
            <div className="glass-card">
              <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 700 }}>
                📈 Accuracy Progress Trend
              </h3>
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.accuracyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="attemptNumber" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" domain={[0, 100]} unit="%" />
                    <Tooltip 
                      formatter={(val) => [`${val}%`, 'Accuracy']}
                      labelFormatter={(label, payload) => {
                        const item = payload && payload[0]?.payload;
                        return item ? `${item.attemptNumber}: ${item.quizTitle}` : label;
                      }}
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      itemStyle={{ color: '#0284c7', fontWeight: 700 }}
                    />
                    <Line type="monotone" dataKey="accuracy" stroke="#0284c7" strokeWidth={3} dot={{ fill: '#0284c7', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* History */}
          <div className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              Attempt History
            </h3>
            {loadingStats ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading your history...</p>
            ) : stats?.attempts?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No quizzes attempted yet. Join one to get started!</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Quiz</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Score</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Accuracy</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.attempts.map((attempt) => (
                      <tr key={attempt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{attempt.quizTitle}</span>
                            {attempt.hasPendingReview && (
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                                border: '1px solid #fde68a'
                              }}>
                                ⏳ Review Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{attempt.score} / {attempt.totalMarks || attempt.totalQuestions}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.85rem',
                            background: attempt.hasPendingReview ? 'rgba(245, 158, 11, 0.12)' : (parseFloat(attempt.percentage) >= 70 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                            color: attempt.hasPendingReview ? '#d97706' : (parseFloat(attempt.percentage) >= 70 ? '#059669' : '#dc2626'),
                            fontWeight: 700
                          }}>
                            {attempt.hasPendingReview ? `${attempt.percentage}% (Grading)` : `${attempt.percentage}%`}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
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
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              Achievements
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {stats?.badges?.map((badge) => (
                <div key={badge.id} style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-card-subtle)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 'var(--radius-md)' 
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{badge.icon}</div>
                  <strong style={{ color: 'var(--text-main)' }}>{badge.title}</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{badge.description}</p>
                </div>
              ))}
              {stats?.badges?.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Earn badges by completing quizzes!</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Join Quiz */}
          <div className="glass-card">
            <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Enter Join Code</h3>
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
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px', fontWeight: 'bold', fontFamily: 'monospace' }}
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
            <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.2rem', textAlign: 'center', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>Global Ranking</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats?.leaderboard.map((student, index) => (
                <div key={student._id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem', 
                  background: student._id === user?.userId ? 'var(--primary-subtle)' : 'var(--bg-card-subtle)', 
                  borderRadius: 'var(--radius-md)',
                  border: student._id === user?.userId ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ color: index < 3 ? '#d97706' : 'var(--text-muted)', fontWeight: 'bold' }}>#{index + 1}</span>
                    <span style={{ fontWeight: student._id === user?.userId ? 'bold' : 'normal', color: 'var(--text-main)' }}>{student.name}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{student.totalScore} pts</span>
                </div>
              ))}
              {stats?.leaderboard.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Leaderboard loading...</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
