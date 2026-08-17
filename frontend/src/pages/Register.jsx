import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { Sparkles, UserPlus, Mail, Lock, User, ArrowRight, GraduationCap, Presentation, ShieldCheck } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, register } = useContext(AuthContext);
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
      const loggedUser = await register(name, email, password, role);
      if (loggedUser.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Server error occurred');
      } else {
        setError('Network error: Could not connect to backend server');
      }
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
              <Sparkles size={14} /> Join AssessIQ
            </div>
            <h1 style={{ fontSize: '2.3rem', lineHeight: '1.2', color: 'var(--text-main)', marginBottom: '1rem' }}>
              Transform Your <span className="gradient-text">Evaluation Workflow</span>
            </h1>
            <p style={{ color: 'var(--text-body)', fontSize: '0.96rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Whether you're an educator running real-time classrooms or a student competing for mastery, AssessIQ provides institutional-grade intelligence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-subtle)', color: 'var(--primary)', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <GraduationCap size={16} />
                </div>
                <span><strong>Students:</strong> Join live games, ask doubts & track rank</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-subtle)', color: 'var(--primary)', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Presentation size={16} />
                </div>
                <span><strong>Faculty:</strong> Host timed quizzes, live control & CSV exports</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-subtle)', color: 'var(--primary)', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <ShieldCheck size={16} />
                </div>
                <span>Secure role-based authentication & instant access</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Institutional Ready</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Free & Open</span>
          </div>
        </div>

        {/* Right Form Pane */}
        <div className="auth-form-pane">
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.85rem', color: 'var(--text-main)', marginBottom: '0.4rem' }}>Create Account</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
              Get started with AssessIQ in seconds
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Interactive Role Selector */}
            <div className="form-group">
              <label>Select Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: role === 'student' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: role === 'student' ? 'var(--primary-subtle)' : '#ffffff',
                    color: role === 'student' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <GraduationCap size={16} color={role === 'student' ? 'var(--primary)' : 'currentColor'} />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: role === 'teacher' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: role === 'teacher' ? 'var(--primary-subtle)' : '#ffffff',
                    color: role === 'teacher' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Presentation size={16} color={role === 'teacher' ? 'var(--primary)' : 'currentColor'} />
                  <span>Faculty</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.75rem' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Kartik Patel"
                />
                <User size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-dim)', pointerEvents: 'none' }} />
              </div>
            </div>

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
              <label>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '2.75rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
                />
                <Lock size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-dim)', pointerEvents: 'none' }} />
              </div>
            </div>

            <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1.25rem' }}>
              {loading ? (
                'Creating Account...'
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Get Started</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="link-text">
            Already have an account? <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
