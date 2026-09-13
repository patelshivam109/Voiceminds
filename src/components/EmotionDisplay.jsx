// frontend/src/components/EmotionDisplay.jsx
import React from 'react';

const EmotionDisplay = ({ result, transcript }) => {
  if (!result) return null;
  
  const { pred_label, confidence, probabilities } = result;
  
  // Define emotion colors
  const emotionColors = {
    angry: '#ef4444',
    happy: '#eab308',
    sad: '#3b82f6',
    neutral: '#6b7280'
  };
  
  // Format confidence as percentage
  const confidencePercent = Math.round(confidence * 100);
  
  return (
    <div className="emotion-display">
      <div className="emotion-result">
        <h3>Detected Emotion</h3>
        <div className="emotion-label" style={{ color: emotionColors[pred_label] }}>
          {pred_label.charAt(0).toUpperCase() + pred_label.slice(1)}
        </div>
        <div className="confidence-meter">
          <div className="confidence-label">Confidence: {confidencePercent}%</div>
          <div className="confidence-bar">
            <div 
              className="confidence-fill" 
              style={{ 
                width: `${confidencePercent}%`,
                backgroundColor: emotionColors[pred_label]
              }}
            ></div>
          </div>
        </div>
      </div>
      
      {probabilities && (
        <div className="emotion-breakdown">
          <h3>Emotion Breakdown</h3>
          {Object.entries(probabilities).map(([emotion, probability]) => (
            <div key={emotion} className="emotion-item">
              <div className="emotion-name">
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </div>
              <div className="emotion-bar">
                <div 
                  className="emotion-fill" 
                  style={{ 
                    width: `${Math.round(probability * 100)}%`,
                    backgroundColor: emotionColors[emotion]
                  }}
                ></div>
              </div>
              <div className="emotion-percent">
                {Math.round(probability * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}
      
      {transcript && (
        <div className="transcript-display">
          <h3>Transcript</h3>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default EmotionDisplay;