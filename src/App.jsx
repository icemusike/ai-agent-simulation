import React, { useState, useEffect } from 'react'
import Room from './components/Room'
import AgentCreator from './components/AgentCreator'
import { SimulationProvider } from './context/SimulationContext'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)

  return (
    <SimulationProvider>
      <div className="app-container">
        <h1>AI Agent Simulation</h1>
        <div className="controls">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={isRunning ? "stop-btn" : "start-btn"}
          >
            {isRunning ? "Pause Simulation" : "Start Simulation"}
          </button>
        </div>
        <div className="main-content">
          <AgentCreator />
          <Room isRunning={isRunning} />
        </div>
      </div>
    </SimulationProvider>
  )
}

export default App
