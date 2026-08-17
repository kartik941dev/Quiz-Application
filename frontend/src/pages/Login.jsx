import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { Sparkles, LogIn, Mail, Lock, ArrowRight, Zap, Trophy, BarChart3, GraduationCap } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'teacher') {
        navigate('/teacher-dashboard', { replace: true });
      } else {
        navigate('/student-dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error: Could not connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card-wrapper">
        {/* Left Hero Pane */}
        <div className="auth-hero-pane">
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <BrandLogo size={42} showText={true} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }} className="badge badge-blue">
              <Sparkles size={14} /> Enterprise Assessment Suite
            </div>
            <h1 style={{ fontSize: '2.3rem', lineHeight: '1.2', color: 'var(--text-main)', marginBottom: '1rem' }}>
              Precision Evaluation in <span className="gradient-text">Real-Time</span>
            </h1>
            <p style={{ color: 'var(--text-body)', fontSize: '0.96rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Empowering institutions and students with synchronous live testing, automated analytics, and deep performance metrics.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-subtle)', color: 'var(--primary)', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Zap size={16} />
                </div>
                <span>Live interactive multiplayer quiz sessions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-subtle)', color: 'var(--primary)', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Trophy size={16} />
                </div>
                <span>Dynamic real-time leaderboards & scoring</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-subtle)', color: 'var(--primary)', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <BarChart3 size={16} />
                </div>
                <span>Detailed topic breakdown & exportable insights</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>System Operational</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>v2.0 Pro</span>
          </div>
        </div>

        {/* Right Form Pane */}
        <div className="auth-form-pane">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.85rem', color: 'var(--text-main)', marginBottom: '0.4rem' }}>Login to Account</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
              Enter your credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '2.75rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                />
                <Mail size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-dim)', pointerEvents: 'none' }} />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ margin: 0 }}>Password</label>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '2.75rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <Lock size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-dim)', pointerEvents: 'none' }} />
              </div>
            </div>

            <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1.5rem' }}>
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="link-text">
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
