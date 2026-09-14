// src/components/TranscriptionDisplay.jsx
import React, { useState } from 'react';

const TranscriptionDisplay = ({ transcript, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!transcript && !isLoading) return null;
  
  return (
    <div className="transcription-display">
      <div className="transcription-header">
        <h3>Transcript</h3>
        {transcript && (
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="transcription-loading">
          <div className="loading-spinner"></div>
          <p>Transcribing audio...</p>
        </div>
      ) : (
        <div className={`transcription-content ${isExpanded ? 'expanded' : ''}`}>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;