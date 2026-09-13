// src/components/EmotionInsights.jsx
import React, { useState, useEffect } from 'react';
import { fetchEmotionalInsights, listAIModels } from '../lib/api';

const EmotionInsights = ({ userId, timeRange }) => {
  const [insights, setInsights] = useState(null);
  const [emotionalSummary, setEmotionalSummary] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiServiceAvailable, setAiServiceAvailable] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchEmotionalInsights(userId, timeRange);
        setInsights(data.insights);
        setEmotionalSummary(data.emotional_summary);
        setSummary(data.summary);
        
        if (data.message && data.message.includes("AI service is not available")) {
          setAiServiceAvailable(false);
        }
      } catch (err) {
        setError(err.message || 'Failed to load insights');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadInsights();
    }
  }, [userId, timeRange]);

  if (loading) {
    return (
      <div className="insights-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing your emotional patterns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insights-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="emotion-insights">
      <h3>Emotional Insights</h3>
      
      {!aiServiceAvailable && (
        <div className="ai-unavailable">
          <p>AI analysis service is not available. Please ensure your Gemini API key is set.</p>
        </div>
      )}
      
      {emotionalSummary && (
        <div className="insights-section">
          <h4>Emotional Summary</h4>
          <p>{emotionalSummary.summary}</p>
          {emotionalSummary.model && (
            <span className="text-xs text-[color:var(--muted)]">
              Powered by {emotionalSummary.model}
            </span>
          )}
        </div>
      )}
      
      {insights && (
        <div className="insights-section">
          <h4>Pattern Analysis</h4>
          <p>{insights.insights}</p>
          {insights.model && (
            <span className="text-xs text-[color:var(--muted)]">
              Powered by {insights.model}
            </span>
          )}
        </div>
      )}
      
      {summary && (
        <div className="insights-section">
          <h4>Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Samples</span>
              <span className="stat-value">{summary.totals.sample_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Confidence</span>
              <span className="stat-value">{Math.round(summary.totals.avg_confidence * 100)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Sessions Today</span>
              <span className="stat-value">{summary.sessions_today}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionInsights;