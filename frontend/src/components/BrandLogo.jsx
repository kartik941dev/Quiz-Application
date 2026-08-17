import React from 'react';

const BrandLogo = ({ size = 36, showText = true, className = '' }) => {
  return (
    <div 
      className={`brand-logo-container ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
    >
      {/* Clean Sky Blue Emblem */}
      <div 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          borderRadius: `${Math.round(size * 0.25)}px`,
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
          position: 'relative'
        }}
      >
        <svg 
          width={Math.round(size * 0.58)} 
          height={Math.round(size * 0.58)} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M12 6L16.5 9.5V14.5L12 18L7.5 14.5V9.5L12 6Z" 
            fill="white" 
            fillOpacity="0.25"
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <circle cx="12" cy="12" r="1.8" fill="white" />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ 
            fontFamily: 'var(--font-heading)', 
            color: '#0f172a', 
            fontWeight: 800, 
            fontSize: `${size * 0.56}px`, 
            letterSpacing: '-0.02em' 
          }}>
            Assess<span style={{ color: '#0284c7' }}>IQ</span>
          </span>
          <span style={{ 
            fontSize: `${Math.max(9, Math.round(size * 0.22))}px`, 
            color: 'var(--text-muted)', 
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>
            Platform
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
