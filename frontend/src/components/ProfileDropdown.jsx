import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const ProfileDropdown = () => {
  const { user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (path, action) => {
    setIsOpen(false);
    if (window.location.pathname === path) {
      if (action === 'create') {
        const formEl = document.querySelector('form');
        if (formEl) {
          formEl.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (action === 'quizzes') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      navigate(path);
      if (action) {
        sessionStorage.setItem('scrollTarget', action);
      }
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  const openPasswordModal = () => {
    setIsOpen(false);
    setIsPasswordModalOpen(true);
  };

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Profile Icon / Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: 'pointer',
          border: '1px solid var(--primary-border)',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)',
          transition: 'background-color 0.15s ease'
        }}
      >
        {user.name?.[0].toUpperCase() || 'U'}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '48px',
          right: '0',
          width: '210px',
          background: '#ffffff',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.1)',
          padding: '0.5rem 0',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '0.65rem 1.25rem 0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '2px' }}>{user.role} Account</div>
          </div>

          {user.role === 'teacher' ? (
            <>
              <MenuItem onClick={() => handleAction('/create-quiz')} label="Create Quiz" />
              <MenuItem onClick={() => handleAction('/teacher-dashboard')} label="My Quizzes" />
              <MenuItem onClick={() => handleAction('/teacher/analytics')} label="Analytics" />
            </>
          ) : (
            <>
              <MenuItem onClick={() => handleAction('/student-dashboard')} label="Dashboard" />
              <MenuItem onClick={() => handleAction('/student-dashboard')} label="Join Quiz" />
            </>
          )}
          
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.4rem 0' }} />
          
          <MenuItem onClick={openPasswordModal} label="Change Password" />
          <MenuItem onClick={handleLogout} label="Logout" color="#dc2626" />
        </div>
      )}

      {isPasswordModalOpen && (
        <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
      )}
    </div>
  );
};

const ChangePasswordModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', msg: '' });

    if (formData.newPassword !== formData.confirmPassword) {
      return setFeedback({ type: 'error', msg: 'New passwords do not match' });
    }

    if (formData.newPassword.length < 6) {
      return setFeedback({ type: 'error', msg: 'New password must be at least 6 characters' });
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      setFeedback({ type: 'success', msg: res.data.message || 'Password updated!' });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        msg: err.response?.data?.message || 'Failed to update password' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }} onClick={onClose}>
      <div 
        className="glass-card" 
        style={{ maxWidth: '400px', width: '100%', padding: '2rem', position: 'relative', background: '#ffffff' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)' }}>Change Password</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>Current Password</label>
            <input 
              type="password" 
              className="form-control" 
              required
              value={formData.currentPassword}
              onChange={e => setFormData({...formData, currentPassword: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>New Password</label>
            <input 
              type="password" 
              className="form-control" 
              required
              value={formData.newPassword}
              onChange={e => setFormData({...formData, newPassword: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>Confirm New Password</label>
            <input 
              type="password" 
              className="form-control" 
              required
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          {feedback.msg && (
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.85rem',
              textAlign: 'center',
              background: feedback.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
              color: feedback.type === 'success' ? 'var(--status-success-text)' : 'var(--status-error-text)',
              border: `1px solid ${feedback.type === 'success' ? 'var(--status-success-border)' : 'var(--status-error-border)'}`
            }}>
              {feedback.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-neutral" 
              onClick={onClose}
              style={{ width: '100%' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn" 
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MenuItem = ({ onClick, label, color = '#334155' }) => (
  <div 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      padding: '0.65rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease, color 0.15s ease',
      color: color,
      fontSize: '0.88rem',
      fontWeight: 500
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = '#f1f5f9';
      e.currentTarget.style.color = '#0f172a';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = color;
    }}
  >
    {label}
  </div>
);

export default ProfileDropdown;
