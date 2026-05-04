import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProfileDropdown = () => {
  const { user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
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

  if (!user || user.role !== 'teacher') return null;

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
        {user.name?.[0].toUpperCase() || 'T'}
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
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '0.5rem 1.25rem 1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 'bold', color: 'white' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Teacher Account</div>
          </div>

          <MenuItem onClick={() => handleAction('/teacher-dashboard')} icon="➕" label="Create Quiz" />
          <MenuItem onClick={() => handleAction('/teacher-dashboard')} icon="📚" label="My Quizzes" />
          <MenuItem onClick={() => handleAction('/analytics')} icon="📈" label="Analytics" />
          <MenuItem onClick={() => handleAction('/reports')} icon="📋" label="Student Reports" />
          
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
          
          <MenuItem onClick={handleLogout} icon="🚪" label="Logout" color="#ff4a4a" />
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ onClick, icon, label, color = 'rgba(255,255,255,0.8)' }) => (
  <div 
    onClick={(e) => {
      e.stopPropagation(); // Ensure click doesn't bubble up
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
      fontSize: '0.9rem',
      pointerEvents: 'auto', // Explicitly enable pointer events
      zIndex: 10000 // Higher than dropdown to ensure clickability
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
    {label}
  </div>
);

export default ProfileDropdown;
