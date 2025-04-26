import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import './RoomCreator.css';

const ROOM_TEMPLATES = [
  {
    id: 'affiliate-network',
    name: 'Affiliate Marketing Network',
    description: 'A business environment where marketers collaborate and compete to promote products.',
    roles: ['Network Owner', 'Affiliate Marketer', 'Product Creator', 'Marketing Manager', 'Customer Support'],
    defaultAgents: 5
  },
  {
    id: 'cooking-show',
    name: 'Cooking Competition Show',
    description: 'A high-pressure kitchen where chefs compete to create the best dishes.',
    roles: ['Head Chef', 'Contestant', 'Judge', 'Host', 'Sous Chef', 'Food Critic'],
    defaultAgents: 6
  },
  {
    id: 'classroom',
    name: 'High School Classroom',
    description: 'An educational setting with teachers and students of varying personalities.',
    roles: ['Teacher', 'Class President', 'Troublemaker', 'Quiet Student', 'Overachiever', 'Exchange Student'],
    defaultAgents: 6
  },
  {
    id: 'office',
    name: 'Corporate Office',
    description: 'A typical workplace with various employees and office politics.',
    roles: ['CEO', 'Manager', 'Assistant', 'Intern', 'HR Representative', 'Sales Executive'],
    defaultAgents: 6
  },
  {
    id: 'soccer-game',
    name: 'Soccer Team',
    description: 'A sports team with players, coaches, and support staff.',
    roles: ['Coach', 'Team Captain', 'Striker', 'Goalkeeper', 'Defender', 'New Recruit', 'Team Manager'],
    defaultAgents: 7
  },
  {
    id: 'custom',
    name: 'Custom Scenario',
    description: 'Create your own unique simulation scenario.',
    roles: [],
    defaultAgents: 0
  }
];

const PERSONALITY_PRESETS = {
  balanced: { friendliness: 0.5, aggression: 0.5, curiosity: 0.5, extraversion: 0.5 },
  friendly: { friendliness: 0.8, aggression: 0.2, curiosity: 0.6, extraversion: 0.7 },
  aggressive: { friendliness: 0.3, aggression: 0.8, curiosity: 0.5, extraversion: 0.6 },
  curious: { friendliness: 0.6, aggression: 0.3, curiosity: 0.9, extraversion: 0.5 },
  shy: { friendliness: 0.6, aggression: 0.2, curiosity: 0.7, extraversion: 0.2 },
  outgoing: { friendliness: 0.7, aggression: 0.4, curiosity: 0.6, extraversion: 0.9 },
  reserved: { friendliness: 0.4, aggression: 0.3, curiosity: 0.5, extraversion: 0.3 }
};

// List of popular names for random agent generation
const POPULAR_NAMES = [
  // Male names
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
  "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth",
  // Female names
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Lisa", "Nancy", "Betty", "Sandra", "Margaret", "Ashley", "Kimberly", "Emily", "Donna", "Michelle",
  // Gender-neutral names
  "Taylor", "Jordan", "Casey", "Riley", "Jessie", "Avery", "Jaime", "Peyton", "Kerry", "Jody"
];

const RoomCreator = ({ onClose }) => {
  const { hasOpenAI, generateRoomStoryboard, addRoom, addAgent, setActiveRoom } = useSimulation();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customRoles, setCustomRoles] = useState('');
  const [agentCount, setAgentCount] = useState(5);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboard, setStoryboard] = useState(null);
  const [generatedAgents, setGeneratedAgents] = useState([]);
  
  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setRoomName(template.name);
    setAgentCount(template.defaultAgents);
    
    if (template.id === 'custom') {
      setCustomDescription('');
      setCustomRoles('');
    }
  };
  
  const handleGenerateStoryboard = async () => {
    if (!hasOpenAI) {
      alert('OpenAI API key is required for storyboard generation. Please add your API key in Settings.');
      return;
    }
    
    setIsGeneratingStoryboard(true);
    
    try {
      const template = selectedTemplate;
      const description = template.id === 'custom' ? customDescription : template.description;
      const roles = template.id === 'custom' 
        ? customRoles.split(',').map(role => role.trim()).filter(role => role) 
        : template.roles;
      
      const storyboardData = await generateRoomStoryboard(
        roomName,
        description,
        roles,
        agentCount
      );
      
      if (storyboardData) {
        setStoryboard(storyboardData.storyboard);
        setGeneratedAgents(storyboardData.agents);
      } else {
        alert('Failed to generate storyboard. Please try again.');
      }
    } catch (error) {
      console.error('Error generating storyboard:', error);
      alert('An error occurred while generating the storyboard.');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };
  
  const handleCreateRoom = () => {
    if (!selectedTemplate) {
      alert('Please select a room template.');
      return;
    }
    
    if (!roomName.trim()) {
      alert('Please enter a room name.');
      return;
    }
    
    const template = selectedTemplate;
    const description = template.id === 'custom' ? customDescription : template.description;
    const roles = template.id === 'custom' 
      ? customRoles.split(',').map(role => role.trim()).filter(role => role) 
      : template.roles;
    
    // Create the room
    const newRoom = addRoom({
      name: roomName,
      description,
      storyboard: storyboard || description
    });
    
    // If we have generated agents from a storyboard, use those
    const agents = generatedAgents.length > 0 ? generatedAgents : generateDefaultAgents(roles, agentCount);
    
    // Add agents to the room
    agents.forEach(agent => {
      addAgent({
        ...agent,
        location: newRoom.id
      });
    });
    
    // Set the active room to the newly created room
    setActiveRoom(newRoom.id);
    
    onClose();
  };
  
  const generateDefaultAgents = (roles, count) => {
    const agents = [];
    const usedNames = new Set();
    
    // Ensure we have enough roles
    const extendedRoles = [...roles];
    while (extendedRoles.length < count) {
      extendedRoles.push(roles[Math.floor(Math.random() * roles.length)]);
    }
    
    // Generate agents
    for (let i = 0; i < count; i++) {
      // Get a unique name
      let name;
      do {
        name = POPULAR_NAMES[Math.floor(Math.random() * POPULAR_NAMES.length)];
      } while (usedNames.has(name));
      usedNames.add(name);
      
      // Select a personality preset
      const presetKeys = Object.keys(PERSONALITY_PRESETS);
      const preset = PERSONALITY_PRESETS[presetKeys[Math.floor(Math.random() * presetKeys.length)]];
      
      // Create agent
      agents.push({
        name,
        role: extendedRoles[i],
        backstory: `A ${extendedRoles[i]} in the ${roomName} simulation.`,
        traits: { ...preset }
      });
    }
    
    return agents;
  };
  
  return (
    <div className="room-creator-overlay">
      <div className="room-creator-modal">
        <div className="room-creator-header">
          <h2>Create New Simulation Room</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="room-creator-content">
          <div className="template-selection">
            <h3>Select a Room Template</h3>
            <div className="template-grid">
              {ROOM_TEMPLATES.map(template => (
                <div 
                  key={template.id}
                  className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => selectTemplate(template)}
                >
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                  {template.roles.length > 0 && (
                    <div className="template-roles">
                      <span>Roles: </span>
                      {template.roles.slice(0, 3).join(', ')}
                      {template.roles.length > 3 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {selectedTemplate && (
            <div className="room-configuration">
              <h3>Configure Your Room</h3>
              
              <div className="form-group">
                <label htmlFor="roomName">Room Name:</label>
                <input
                  type="text"
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter a name for your simulation room"
                />
              </div>
              
              {selectedTemplate.id === 'custom' && (
                <>
                  <div className="form-group">
                    <label htmlFor="customDescription">Room Description:</label>
                    <textarea
                      id="customDescription"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Describe your custom simulation scenario"
                      rows="3"
                    ></textarea>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="customRoles">Roles (comma-separated):</label>
                    <input
                      type="text"
                      id="customRoles"
                      value={customRoles}
                      onChange={(e) => setCustomRoles(e.target.value)}
                      placeholder="E.g., CEO, Manager, Employee, Intern"
                    />
                  </div>
                </>
              )}
              
              <div className="form-group">
                <label htmlFor="agentCount">Number of Agents:</label>
                <div className="agent-count-control">
                  <button 
                    type="button" 
                    onClick={() => setAgentCount(Math.max(2, agentCount - 1))}
                    disabled={agentCount <= 2}
                  >-</button>
                  <input
                    type="number"
                    id="agentCount"
                    value={agentCount}
                    onChange={(e) => setAgentCount(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                    min="2"
                    max="10"
                  />
                  <button 
                    type="button" 
                    onClick={() => setAgentCount(Math.min(10, agentCount + 1))}
                    disabled={agentCount >= 10}
                  >+</button>
                </div>
                <div className="input-hint">Min: 2, Max: 10</div>
              </div>
              
              {hasOpenAI && (
                <div className="storyboard-section">
                  <h3>AI Storyboard Generation</h3>
                  <p className="storyboard-description">
                    Generate a detailed storyboard and agent profiles for your simulation using AI.
                    This will create a narrative framework and personalities for your agents.
                  </p>
                  
                  <button 
                    type="button" 
                    className="generate-storyboard-btn"
                    onClick={handleGenerateStoryboard}
                    disabled={isGeneratingStoryboard}
                  >
                    {isGeneratingStoryboard ? 'Generating...' : 'Generate Storyboard'}
                  </button>
                  
                  {storyboard && (
                    <div className="storyboard-preview">
                      <h4>Generated Storyboard</h4>
                      <div className="storyboard-content">
                        {storyboard}
                      </div>
                      <div className="generated-agents">
                        <h4>Generated Agents ({generatedAgents.length})</h4>
                        <ul>
                          {generatedAgents.map((agent, index) => (
                            <li key={index}>
                              <strong>{agent.name}</strong> - {agent.role}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="room-creator-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            type="button" 
            className="create-room-btn"
            onClick={handleCreateRoom}
            disabled={!selectedTemplate || !roomName.trim()}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomCreator;
