// src/components/AISettings.jsx
import React, { useState, useEffect } from 'react';
import { listAIModels } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const AISettings = ({ onModelChange }) => {
  const { showToast } = useToast();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiServiceAvailable, setAiServiceAvailable] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await listAIModels();
        setModels(data.models || []);
        
        if (data.models && data.models.length > 0) {
          // Set the first model as default if the selected one is not available
          if (!data.models.includes(selectedModel)) {
            setSelectedModel(data.models[0]);
            onModelChange(data.models[0]);
          }
        } else {
          setAiServiceAvailable(false);
        }
      } catch (err) {
        setError(err.message || 'Failed to load AI models');
        setAiServiceAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [selectedModel, onModelChange]);

  const handleModelChange = (e) => {
    const model = e.target.value;
    setSelectedModel(model);
    onModelChange(model);
    showToast(`AI model changed to ${model}`, { type: 'success' });
  };

  return (
    <div className="ai-settings">
      <h3>AI Settings</h3>
      
      {!aiServiceAvailable && (
        <div className="ai-unavailable">
          <p>AI service is not available. Please ensure your Gemini API key is set.</p>
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
            Add <code>GEMINI_API_KEY="your-api-key"</code> to your backend <code>.env</code> file and restart the Flask server.
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="loading-spinner"></div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : models.length > 0 ? (
        <div className="model-selector">
          <label htmlFor="ai-model">Select AI Model:</label>
          <select
            id="ai-model"
            value={selectedModel}
            onChange={handleModelChange}
            className="form-control"
          >
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <p className="model-description">
            The selected AI model will be used for emotional analysis and insights.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default AISettings;