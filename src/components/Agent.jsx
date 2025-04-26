import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import './Agent.css';

const Agent = ({ agent }) => {
  const { removeAgent, getRelationship, agents, updateAgent } = useSimulation();
  const [showDetails, setShowDetails] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(agent.name);

  const getRelationshipStatus = (value) => {
    if (value > 75) return 'Best Friends';
    if (value > 50) return 'Friends';
    if (value > 25) return 'Friendly';
    if (value > -25) return 'Neutral';
    if (value > -50) return 'Dislike';
    if (value > -75) return 'Enemies';
    return 'Arch Enemies';
  };

  const getRelationshipColor = (value) => {
    if (value > 50) return '#4caf50';
    if (value > 0) return '#8bc34a';
    if (value > -50) return '#ff9800';
    return '#f44336';
  };

  const getPersonalityTrait = (trait, value) => {
    const traitLabels = {
      friendliness: ['Hostile', 'Cold', 'Reserved', 'Neutral', 'Warm', 'Friendly', 'Loving'],
      aggression: ['Pacifist', 'Gentle', 'Calm', 'Neutral', 'Assertive', 'Aggressive', 'Violent'],
      curiosity: ['Incurious', 'Disinterested', 'Cautious', 'Neutral', 'Interested', 'Curious', 'Obsessive'],
      extraversion: ['Reclusive', 'Introverted', 'Reserved', 'Balanced', 'Sociable', 'Extraverted', 'Attention-seeking']
    };
    
    const labels = traitLabels[trait] || ['Very Low', 'Low', 'Somewhat Low', 'Moderate', 'Somewhat High', 'High', 'Very High'];
    const index = Math.min(Math.floor(value * 6), 6);
    
    return labels[index];
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    if (editedName.trim()) {
      updateAgent(agent.id, { name: editedName.trim() });
      setIsEditingName(false);
    }
  };

  const handleNameCancel = () => {
    setEditedName(agent.name);
    setIsEditingName(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  return (
    <div className="agent-card">
      <div className="agent-header">
        {isEditingName ? (
          <div className="name-edit-container">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="name-edit-input"
              maxLength={20}
            />
            <div className="name-edit-buttons">
              <button className="name-save-btn" onClick={handleNameSave}>
                Save
              </button>
              <button className="name-cancel-btn" onClick={handleNameCancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <h3 onClick={handleNameEdit} className="editable-name" title="Click to edit name">
            {agent.name}
            <span className="edit-icon">✏️</span>
          </h3>
        )}
        <div className="agent-controls">
          <button 
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          <button 
            className="remove-agent"
            onClick={() => removeAgent(agent.id)}
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="agent-basic-info">
        <p><strong>Role:</strong> {agent.role}</p>
        <div className="personality-summary">
          <div className="trait-bar">
            <span>Friendliness:</span>
            <div className="trait-bar-bg">
              <div 
                className="trait-bar-fill" 
                style={{ width: `${agent.traits.friendliness * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="trait-bar">
            <span>Aggression:</span>
            <div className="trait-bar-bg">
              <div 
                className="trait-bar-fill" 
                style={{ width: `${agent.traits.aggression * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {showDetails && (
        <div className="agent-details">
          <div className="personality-traits">
            <h4>Personality Profile</h4>
            <ul>
              {Object.entries(agent.traits).map(([trait, value]) => (
                <li key={trait}>
                  <strong>{trait.charAt(0).toUpperCase() + trait.slice(1)}:</strong> 
                  {getPersonalityTrait(trait, value)} ({Math.round(value * 100)}%)
                </li>
              ))}
            </ul>
          </div>
          
          <div className="agent-relationships">
            <h4>Relationships</h4>
            {agents.length <= 1 ? (
              <p>No other agents to form relationships with.</p>
            ) : (
              <ul>
                {agents
                  .filter(otherAgent => otherAgent.id !== agent.id)
                  .map(otherAgent => {
                    const relationshipValue = getRelationship(agent.id, otherAgent.id);
                    return (
                      <li key={otherAgent.id}>
                        <span>{otherAgent.name}:</span>
                        <span 
                          className="relationship-status"
                          style={{ color: getRelationshipColor(relationshipValue) }}
                        >
                          {getRelationshipStatus(relationshipValue)} ({relationshipValue})
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
          
          <div className="agent-backstory">
            <h4>Backstory</h4>
            <p>{agent.backstory || "No backstory available."}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agent;
