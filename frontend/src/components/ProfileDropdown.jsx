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

  const handleAction = (path) => {
    setIsOpen(false);
    navigate(path);
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
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #646cff 0%, #4a51e6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {user.name?.[0].toUpperCase() || 'U'}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '0',
          width: '220px',
          background: 'rgba(30, 30, 35, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          padding: '0.75rem 0',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '0.5rem 1.25rem 1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 'bold', color: 'white' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user.role} Account</div>
          </div>

          {user.role === 'teacher' ? (
            <>
              <MenuItem onClick={() => handleAction('/teacher-dashboard')} icon="➕" label="Create Quiz" />
              <MenuItem onClick={() => handleAction('/teacher-dashboard')} icon="📚" label="My Quizzes" />
              <MenuItem onClick={() => handleAction('/analytics')} icon="📈" label="Analytics" />
            </>
          ) : (
            <>
              <MenuItem onClick={() => handleAction('/student-dashboard')} icon="🏠" label="Dashboard" />
              <MenuItem onClick={() => handleAction('/student-dashboard')} icon="🎯" label="Join Quiz" />
            </>
          )}
          
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
          
          <MenuItem onClick={openPasswordModal} icon="🔑" label="Change Password" />
          <MenuItem onClick={handleLogout} icon="🚪" label="Logout" color="#ff4a4a" />
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
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }} onClick={onClose}>
      <div 
        className="glass-card" 
        style={{ maxWidth: '400px', width: '100%', padding: '2rem', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>🔒 Change Password</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Current Password</label>
            <input 
              type="password" 
              className="form-control" 
              required
              value={formData.currentPassword}
              onChange={e => setFormData({...formData, currentPassword: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>New Password</label>
            <input 
              type="password" 
              className="form-control" 
              required
              value={formData.newPassword}
              onChange={e => setFormData({...formData, newPassword: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Confirm New Password</label>
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
              borderRadius: '8px', 
              fontSize: '0.9rem',
              textAlign: 'center',
              background: feedback.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 74, 74, 0.2)',
              color: feedback.type === 'success' ? '#4caf50' : '#ff4a4a',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 74, 74, 0.3)'}`
            }}>
              {feedback.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn" 
              onClick={onClose}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn" 
              disabled={loading}
              style={{ background: '#646cff' }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MenuItem = ({ onClick, icon, label, color = 'rgba(255,255,255,0.8)' }) => (
  <div 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      padding: '0.75rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
      transition: 'background 0.2s',
      color: color,
      fontSize: '0.9rem'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
    {label}
  </div>
);

export default ProfileDropdown;
