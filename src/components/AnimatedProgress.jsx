// src/components/AnimatedProgress.jsx
import React, { useEffect, useRef, useState } from 'react';

const AnimatedProgress = ({ value, max = 100, color = 'var(--primary)', size = 'medium' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const progressRef = useRef(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };
  
  return (
    <div className={`w-full bg-white/10 rounded-full overflow-hidden ${sizeClasses[size]}`}>
      <div 
        ref={progressRef}
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ 
          width: `${(displayValue / max) * 100}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
};

export default AnimatedProgress;