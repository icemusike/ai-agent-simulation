import React, { useState, useEffect } from 'react'
import Room from './components/Room'
import AgentCreator from './components/AgentCreator'
import Settings from './components/Settings'
import RoomCreator from './components/RoomCreator'
import { SimulationProvider, useSimulation } from './context/SimulationContext'
import './App.css'

// Create a wrapper component that has access to the simulation context
const AppContent = () => {
  const simulation = useSimulation();
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showRoomCreator, setShowRoomCreator] = useState(false)
  const [openAIKey, setOpenAIKey] = useState(() => {
    return localStorage.getItem('openai_api_key') || '';
  });
  
  useEffect(() => {
    console.log("Simulation context in AppContent:", simulation);
  }, [simulation]);
  
  const handleSaveSettings = (settings) => {
    if (settings.openAIKey) {
      localStorage.setItem('openai_api_key', settings.openAIKey);
      setOpenAIKey(settings.openAIKey);
    }
    setShowSettings(false);
  };

  return (
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
          onClick={() => setShowRoomCreator(true)}
          className="create-room-btn"
        >
          Create Room
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
      
      {showRoomCreator && (
        <RoomCreator 
          onClose={() => setShowRoomCreator(false)}
        />
      )}
    </div>
  );
};

function App() {
  const [openAIKey, setOpenAIKey] = useState(() => {
    const savedKey = localStorage.getItem('openai_api_key') || '';
    console.log("Initial OpenAI key loaded:", savedKey ? "Key exists" : "No key");
    return savedKey;
  });

  useEffect(() => {
    console.log("App mounted with SimulationProvider");
  }, []);

  return (
    <SimulationProvider openAIKey={openAIKey}>
      <AppContent />
    </SimulationProvider>
  )
}

export default App
