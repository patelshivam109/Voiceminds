// src/components/FloatingActionButton.jsx
import React, { useState } from 'react';

const FloatingActionButton = ({ icon, onClick, label, position = 'bottom-right' }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };
  
  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <button
        className={`fab ${isHovered ? 'fab-hover' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={label}
      >
        {icon}
        {isHovered && <span className="fab-tooltip">{label}</span>}
      </button>
    </div>
  );
};

export default FloatingActionButton;