import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Hide navbar on login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  return (
    <nav className={`universal-nav ${scrolled ? 'universal-nav--scrolled' : ''}`}>
      <div className="universal-nav-inner">
        
        {/* Logo */}
        <Link to="/" className="universal-nav-logo">
          <div className="universal-nav-logo-icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10" stroke="url(#grad1)" strokeWidth="2"/>
              <circle cx="11" cy="11" r="4" fill="url(#grad1)"/>
              <line x1="11" y1="1" x2="11" y2="5" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="11" y1="17" x2="11" y2="21" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="1" y1="11" x2="5" y2="11" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="17" y1="11" x2="21" y2="11" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="22" y2="22">
                  <stop stopColor="#FD8A6B"/>
                  <stop offset="1" stopColor="#FFA95A"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          ShiftSync
        </Link>

        {/* Center Nav Links (Public) */}
        {!user && (
          <div className="universal-nav-links">
            <Link to="/" className={`universal-nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
            <Link to="/about" className={`universal-nav-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
            <Link to="/contact" className={`universal-nav-link ${isActive('/contact') ? 'active' : ''}`}>Contact</Link>
          </div>
        )}

        {/* Right Side */}
        <div className="universal-nav-right">
          {user ? (
            // Authenticated User
            <>
              <span className="universal-user-badge">{user.role?.toUpperCase() || 'USER'}</span>
              <span className="universal-user-name">Welcome, {user.name}</span>
              <button className="universal-logout-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            // Public User
            <>
              <Link to="/login" className="universal-nav-login">Login</Link>
              <Link to="/signup" className="universal-nav-signup">Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button className="universal-nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span className={menuOpen ? 'open' : ''} />
          <span className={menuOpen ? 'open' : ''} />
          <span className={menuOpen ? 'open' : ''} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="universal-nav-mobile">
          {!user && (
            <>
              <Link to="/" className="universal-nav-mobile-link" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link to="/about" className="universal-nav-mobile-link" onClick={() => setMenuOpen(false)}>About</Link>
              <Link to="/contact" className="universal-nav-mobile-link" onClick={() => setMenuOpen(false)}>Contact</Link>
              <Link to="/login" className="universal-nav-mobile-link" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="universal-nav-mobile-signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
          {user && (
            <>
              <span className="universal-mobile-user">{user.name} ({user.role?.toUpperCase()})</span>
              <button className="universal-mobile-logout" onClick={() => { handleLogout(); setMenuOpen(false); }}>Logout</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
