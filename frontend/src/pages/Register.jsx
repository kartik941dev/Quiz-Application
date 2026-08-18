import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { Mail, Lock, User, UserPlus, GraduationCap, Presentation } from 'lucide-react';

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        padding: '2.5rem 2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <BrandLogo size={44} showText={true} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
            Create an Account
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
            Join AssessIQ to participate in and host quizzes
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '8px',
            fontSize: '0.86rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Role Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              I am a:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRole('student')}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: role === 'student' ? '1.5px solid var(--primary)' : '1px solid #e2e8f0',
                  background: role === 'student' ? 'var(--primary-subtle)' : '#ffffff',
                  color: role === 'student' ? 'var(--primary)' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <GraduationCap size={18} />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('teacher')}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: role === 'teacher' ? '1.5px solid var(--primary)' : '1px solid #e2e8f0',
                  background: role === 'teacher' ? 'var(--primary-subtle)' : '#ffffff',
                  color: role === 'teacher' ? 'var(--primary)' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Presentation size={18} />
                <span>Teacher / Faculty</span>
              </button>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Full Name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem', fontSize: '0.95rem' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: '2.75rem', fontSize: '0.95rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.75rem', fontSize: '0.95rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              'Creating Account...'
            ) : (
              <>
                <UserPlus size={18} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.9rem',
          color: '#64748b'
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
