// src/components/GlassCard.jsx
import React from 'react';

const GlassCard = ({ children, className = '', hover = true, ...props }) => {
  return (
    <div 
      className={`glass-card ${hover ? 'glass-card-hover' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;