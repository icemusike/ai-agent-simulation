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

// Example preset guidelines that users can choose from
const GUIDELINE_PRESETS = [
  { 
    name: "Select a preset (optional)", 
    value: "" 
  },
  { 
    name: "Comedy", 
    value: "Create a comedic scenario with lots of misunderstandings and humorous interactions. Include funny personality quirks for the agents and set up situations that lead to amusing conflicts and resolutions." 
  },
  { 
    name: "Drama", 
    value: "Design a dramatic narrative with emotional depth and complex relationships. Include personal histories that create tension, secrets that can be revealed, and opportunities for character growth." 
  },
  { 
    name: "Mystery", 
    value: "Incorporate a mystery that the agents need to solve together. Create a scenario where information is distributed among different agents, and they need to collaborate to discover the truth." 
  },
  { 
    name: "Competition", 
    value: "Set up a competitive environment where agents are vying for a specific goal or reward. Create balanced but contrasting personalities, with some agents forming alliances while others prefer to work alone." 
  },
  { 
    name: "Cooperation", 
    value: "Design a scenario that encourages teamwork and cooperation. Create complementary personalities and skills that work well together, but also include enough diversity to make the interactions interesting." 
  },
  { 
    name: "Conflict Resolution", 
    value: "Create a scenario with initial tensions and conflicts between agents, but with pathways toward resolution. Design personalities that clash at first but can learn to understand and appreciate each other." 
  },
  { 
    name: "Office Politics", 
    value: "Focus on workplace dynamics with hierarchies, ambitions, and professional relationships. Include power struggles, career advancement opportunities, and workplace challenges." 
  },
  { 
    name: "Classroom Dynamics", 
    value: "Create a classroom environment with student-teacher relationships and peer interactions. Include learning objectives, classroom challenges, and educational growth opportunities." 
  },
  { 
    name: "Cooking Competition", 
    value: "Design a high-pressure culinary competition with time constraints, technical challenges, and judging criteria. Balance competitive spirit with opportunities for collaboration and learning." 
  },
  { 
    name: "Sports Team", 
    value: "Focus on team dynamics, training scenarios, and competition preparation. Include leadership challenges, individual ambitions, and team cohesion elements." 
  }
];

const RoomCreator = ({ onClose }) => {
  const { hasOpenAI, generateRoomStoryboard, addRoom, addAgent, setActiveRoom, moveAgent } = useSimulation();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customRoles, setCustomRoles] = useState('');
  const [userGuidelines, setUserGuidelines] = useState('');
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
        agentCount,
        userGuidelines
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
    
    // Ensure we have at least 2 agents
    if (generatedAgents.length > 0 && generatedAgents.length < 2) {
      alert('At least 2 agents are required for the simulation.');
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
    const createdAgents = agents.map(agent => {
      // Create the agent without specifying location
      const newAgent = addAgent({
        ...agent
      });
      
      // Explicitly move the agent to the new room
      moveAgent(newAgent.id, newRoom.id);
      
      return newAgent;
    });
    
    // Set the active room to the newly created room
    setActiveRoom(newRoom.id);
    
    // Close the modal
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

                  <div className="storyboard-customization">
                    <h4>
                      <span className="icon">✨</span> 
                      Customize Your Storyboard
                    </h4>
                    <p className="customization-description">
                      Shape the narrative by providing guidelines to the AI. You can influence the genre, themes, 
                      relationships, conflicts, and overall mood of your simulation.
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="userGuidelines">Storyboard Guidelines:</label>
                    <div className="guideline-preset-container">
                      <select 
                        className="guideline-preset-select"
                        onChange={(e) => {
                          const selectedValue = e.target.value;
                          setUserGuidelines(selectedValue);
                        }}
                      >
                        {GUIDELINE_PRESETS.map((preset, index) => (
                          <option key={index} value={preset.value}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                      <div className="preset-help">← Select a preset or write your own</div>
                    </div>
                    <textarea
                      id="userGuidelines"
                      value={userGuidelines}
                      onChange={(e) => setUserGuidelines(e.target.value)}
                      placeholder="Provide guidelines for the AI to customize your storyboard (e.g., genre, themes, specific relationships or conflicts, mood, time period)"
                      rows="4"
                    ></textarea>
                    <div className="input-hint">
                      The AI will use these guidelines to shape the story, characters, and interactions.
                    </div>
                  </div>
                  
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
                        <div className="agents-header">
                          <h4>Generated Agents ({generatedAgents.length})</h4>
                          <button 
                            type="button" 
                            className="add-agent-btn"
                            onClick={() => {
                              const templateIndex = Math.floor(Math.random() * PERSONALITY_PRESETS.length);
                              const preset = Object.values(PERSONALITY_PRESETS)[templateIndex];
                              const newAgent = {
                                name: POPULAR_NAMES[Math.floor(Math.random() * POPULAR_NAMES.length)],
                                role: selectedTemplate.id === 'custom' 
                                  ? (customRoles.split(',').map(role => role.trim())[0] || 'Agent') 
                                  : selectedTemplate.roles[0],
                                backstory: `A new agent in the ${roomName} simulation.`,
                                traits: { ...preset }
                              };
                              setGeneratedAgents([...generatedAgents, newAgent]);
                            }}
                            disabled={generatedAgents.length >= 10}
                            title={generatedAgents.length >= 10 ? "Maximum 10 agents allowed" : "Add a new agent"}
                          >
                            Add Agent
                          </button>
                        </div>
                        <p className="agent-edit-hint">You can customize the agents' names and roles below before creating the room.</p>
                        <div className="agent-edit-list">
                          {generatedAgents.map((agent, index) => (
                            <div key={index} className="agent-edit-item">
                              <div className="agent-edit-header">Agent {index + 1}</div>
                              <button 
                                className="remove-agent-btn"
                                onClick={() => {
                                  const updatedAgents = [...generatedAgents];
                                  updatedAgents.splice(index, 1);
                                  setGeneratedAgents(updatedAgents);
                                }}
                                disabled={generatedAgents.length <= 2}
                                title={generatedAgents.length <= 2 ? "At least 2 agents are required" : "Remove agent"}
                              >
                                ×
                              </button>
                              <div className="agent-edit-field">
                                <label htmlFor={`agent-name-${index}`}>Name:</label>
                                <input
                                  id={`agent-name-${index}`}
                                  type="text"
                                  value={agent.name}
                                  onChange={(e) => {
                                    const updatedAgents = [...generatedAgents];
                                    updatedAgents[index] = {
                                      ...updatedAgents[index],
                                      name: e.target.value
                                    };
                                    setGeneratedAgents(updatedAgents);
                                  }}
                                />
                              </div>
                              <div className="agent-edit-field">
                                <label htmlFor={`agent-role-${index}`}>Role:</label>
                                <input
                                  id={`agent-role-${index}`}
                                  type="text"
                                  value={agent.role}
                                  onChange={(e) => {
                                    const updatedAgents = [...generatedAgents];
                                    updatedAgents[index] = {
                                      ...updatedAgents[index],
                                      role: e.target.value
                                    };
                                    setGeneratedAgents(updatedAgents);
                                  }}
                                />
                              </div>
                              <div className="agent-traits">
                                <div className="trait-display">
                                  <span className="trait-label">Friendliness:</span>
                                  <div className="trait-slider-container">
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="1" 
                                      step="0.1" 
                                      value={agent.traits.friendliness}
                                      onChange={(e) => {
                                        const updatedAgents = [...generatedAgents];
                                        updatedAgents[index] = {
                                          ...updatedAgents[index],
                                          traits: {
                                            ...updatedAgents[index].traits,
                                            friendliness: parseFloat(e.target.value)
                                          }
                                        };
                                        setGeneratedAgents(updatedAgents);
                                      }}
                                      className="trait-slider"
                                    />
                                    <div className="trait-bar">
                                      <div 
                                        className="trait-value" 
                                        style={{width: `${agent.traits.friendliness * 100}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="trait-display">
                                  <span className="trait-label">Aggression:</span>
                                  <div className="trait-slider-container">
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="1" 
                                      step="0.1" 
                                      value={agent.traits.aggression}
                                      onChange={(e) => {
                                        const updatedAgents = [...generatedAgents];
                                        updatedAgents[index] = {
                                          ...updatedAgents[index],
                                          traits: {
                                            ...updatedAgents[index].traits,
                                            aggression: parseFloat(e.target.value)
                                          }
                                        };
                                        setGeneratedAgents(updatedAgents);
                                      }}
                                      className="trait-slider"
                                    />
                                    <div className="trait-bar">
                                      <div 
                                        className="trait-value" 
                                        style={{width: `${agent.traits.aggression * 100}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="trait-display">
                                  <span className="trait-label">Curiosity:</span>
                                  <div className="trait-slider-container">
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="1" 
                                      step="0.1" 
                                      value={agent.traits.curiosity}
                                      onChange={(e) => {
                                        const updatedAgents = [...generatedAgents];
                                        updatedAgents[index] = {
                                          ...updatedAgents[index],
                                          traits: {
                                            ...updatedAgents[index].traits,
                                            curiosity: parseFloat(e.target.value)
                                          }
                                        };
                                        setGeneratedAgents(updatedAgents);
                                      }}
                                      className="trait-slider"
                                    />
                                    <div className="trait-bar">
                                      <div 
                                        className="trait-value" 
                                        style={{width: `${agent.traits.curiosity * 100}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="trait-display">
                                  <span className="trait-label">Extraversion:</span>
                                  <div className="trait-slider-container">
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="1" 
                                      step="0.1" 
                                      value={agent.traits.extraversion}
                                      onChange={(e) => {
                                        const updatedAgents = [...generatedAgents];
                                        updatedAgents[index] = {
                                          ...updatedAgents[index],
                                          traits: {
                                            ...updatedAgents[index].traits,
                                            extraversion: parseFloat(e.target.value)
                                          }
                                        };
                                        setGeneratedAgents(updatedAgents);
                                      }}
                                      className="trait-slider"
                                    />
                                    <div className="trait-bar">
                                      <div 
                                        className="trait-value" 
                                        style={{width: `${agent.traits.extraversion * 100}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="agent-backstory">
                                <span className="backstory-label">Backstory:</span>
                                <textarea
                                  className="backstory-edit"
                                  value={agent.backstory}
                                  onChange={(e) => {
                                    const updatedAgents = [...generatedAgents];
                                    updatedAgents[index] = {
                                      ...updatedAgents[index],
                                      backstory: e.target.value
                                    };
                                    setGeneratedAgents(updatedAgents);
                                  }}
                                  rows="2"
                                ></textarea>
                              </div>
                            </div>
                          ))}
                        </div>
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
