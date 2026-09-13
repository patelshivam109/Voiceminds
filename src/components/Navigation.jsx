// frontend/src/components/Navigation.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Navigation = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleNavigate = (page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };
  
  return (
    <nav className="navigation">
      <div className="nav-header">
        <div className="nav-brand">
          <h1>VoiceMind</h1>
        </div>
        <button className="nav-toggle" onClick={toggleMenu}>
          <span className={`hamburger ${isMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
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
              Dashboard
            </button>
          </li>
          <li className={`nav-item ${currentPage === 'library' ? 'active' : ''}`}>
            <button onClick={() => handleNavigate('library')}>
              Library
            </button>
          </li>
          <li className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}>
            <button onClick={() => handleNavigate('settings')}>
              Settings
            </button>
          </li>
        </ul>
        
        <div className="nav-footer">
          <button className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;