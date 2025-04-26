import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ onClose, onSave, initialSettings }) => {
  const [settings, setSettings] = useState({
    openAIKey: initialSettings.openAIKey || '',
  });
  const [showKey, setShowKey] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Simulation Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h3>OpenAI Integration</h3>
            <p className="settings-description">
              Enter your OpenAI API key to enable AI-generated messages for agents. 
              When enabled, agents will communicate using the OpenAI API, with messages 
              tailored to their personality traits and relationships.
            </p>
            
            <div className="form-group">
              <label htmlFor="openAIKey">OpenAI API Key:</label>
              <div className="api-key-input">
                <input
                  type={showKey ? "text" : "password"}
                  id="openAIKey"
                  name="openAIKey"
                  value={settings.openAIKey}
                  onChange={handleChange}
                  placeholder="Enter your OpenAI API key"
                />
                <button 
                  type="button" 
                  className="toggle-visibility"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <div className="api-key-info">
                {settings.openAIKey ? (
                  <span className="key-status active">OpenAI integration is active</span>
                ) : (
                  <span className="key-status inactive">OpenAI integration is inactive</span>
                )}
              </div>
            </div>
            
            <div className="settings-info">
              <p>
                <strong>Note:</strong> Your API key is stored locally in your browser and is never sent to our servers.
                Standard OpenAI API usage rates apply.
              </p>
            </div>
          </div>
          
          <div className="settings-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="save-btn">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
