import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    // If user is not logged in and trying to access protected routes, redirect to login
    if (!currentUser && ['/history', '/speech-to-text'].includes(location.pathname)) {
      navigate('/login');
    }
  }, [currentUser, location.pathname, navigate]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/">Text Summarizer</Link>
      </div>
      <ul className="nav-links">
        <li>
          <Link to="/" className={isActive('/') ? 'active' : ''}>
            Home
          </Link>
        </li>
        {currentUser ? (
          <>
            <li>
              <Link to="/history" className={isActive('/history') ? 'active' : ''}>
                History
              </Link>
            </li>
            <li>
              <Link to="/speech-to-text" className={isActive('/speech-to-text') ? 'active' : ''}>
                Speech to Text
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} className="nav-button">
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" className={isActive('/login') ? 'active' : ''}>
                Login
              </Link>
            </li>
            <li>
              <Link to="/signup" className={isActive('/signup') ? 'active' : ''}>
                Sign Up
              </Link>
            </li>
          </>
        )}
        <li>
          <Link to="/about" className={isActive('/about') ? 'active' : ''}>
            About
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation; 