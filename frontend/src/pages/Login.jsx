import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

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
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
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
        maxWidth: '440px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        padding: '2.5rem 2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <BrandLogo size={44} showText={true} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
            Welcome Back
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
            Enter your credentials to access your dashboard
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                placeholder="••••••••"
                autoComplete="current-password"
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
              'Signing in...'
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
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
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
