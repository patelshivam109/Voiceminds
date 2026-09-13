// src/components/ModernNavigation.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ModernNavigation = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleNavigate = (page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };
  
  return (
    <nav className={`modern-nav ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-brand">
          <h1>VoiceMind</h1>
        </div>
        
        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          <div className="nav-user">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          
          <ul className="nav-links">
            <li className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => handleNavigate('dashboard')}>
                <span className="nav-icon">📊</span>
                <span className="nav-text">Dashboard</span>
              </button>
            </li>
            <li className={`nav-item ${currentPage === 'library' ? 'active' : ''}`}>
              <button onClick={() => handleNavigate('library')}>
                <span className="nav-icon">📚</span>
                <span className="nav-text">Library</span>
              </button>
            </li>
            <li className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}>
              <button onClick={() => handleNavigate('settings')}>
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Settings</span>
              </button>
            </li>
          </ul>
          
          <div className="nav-actions">
            <button className="btn btn-ghost" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
        
        <button className="nav-toggle" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

export default ModernNavigation;