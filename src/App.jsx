import React, { useState, useEffect } from 'react'
import Room from './components/Room'
import AgentCreator from './components/AgentCreator'
import Settings from './components/Settings'
import { SimulationProvider } from './context/SimulationContext'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [openAIKey, setOpenAIKey] = useState(() => {
    return localStorage.getItem('openai_api_key') || '';
  });

  const handleSaveSettings = (settings) => {
    if (settings.openAIKey) {
      localStorage.setItem('openai_api_key', settings.openAIKey);
      setOpenAIKey(settings.openAIKey);
    }
    setShowSettings(false);
  };

  return (
    <SimulationProvider openAIKey={openAIKey}>
      <div className="app-container">
        <h1>AI Agent Simulation</h1>
        <div className="controls">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={isRunning ? "stop-btn" : "start-btn"}
          >
            {isRunning ? "Pause Simulation" : "Start Simulation"}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="settings-btn"
          >
            Settings
          </button>
        </div>
        <div className="main-content">
          <AgentCreator />
          <Room isRunning={isRunning} />
        </div>
        
        {showSettings && (
          <Settings 
            onClose={() => setShowSettings(false)} 
            onSave={handleSaveSettings}
            initialSettings={{ openAIKey }}
          />
        )}
      </div>
    </SimulationProvider>
  )
}

export default App
