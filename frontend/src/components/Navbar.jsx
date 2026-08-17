import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import BrandLogo from './BrandLogo';
import { Sparkles } from 'lucide-react';

const Navbar = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const homeRoute = user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard';

  return (
    <nav style={{
      padding: '0.85rem 2rem',
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
    }}>
      <Link to={homeRoute} style={{ textDecoration: 'none' }}>
        <BrandLogo size={36} showText={true} />
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div className="badge badge-blue" style={{ display: 'none', md: 'inline-flex' }}>
          <Sparkles size={12} /> {user.role === 'teacher' ? 'Faculty Workspace' : 'Student Portal'}
        </div>
        <ProfileDropdown />
      </div>
    </nav>
  );
};

export default Navbar;
