import React, { useState, useEffect, useRef } from 'react';
import { useSimulation } from '../context/SimulationContext';
import './AgentCreator.css';

// List of popular names for random agent generation
const popularNames = [
  // Male names
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
  "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth",
  "Kevin", "Brian", "George", "Timothy", "Ronald", "Jason", "Edward", "Jeffrey", "Ryan", "Jacob",
  // Female names
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Lisa", "Nancy", "Betty", "Sandra", "Margaret", "Ashley", "Kimberly", "Emily", "Donna", "Michelle",
  "Carol", "Amanda", "Dorothy", "Melissa", "Deborah", "Stephanie", "Rebecca", "Laura", "Sharon", "Cynthia",
  // Gender-neutral names
  "Taylor", "Jordan", "Casey", "Riley", "Jessie", "Avery", "Jaime", "Peyton", "Kerry", "Jody",
  "Kendall", "Skyler", "Frankie", "Pat", "Quinn", "Harley", "Reese", "Robbie", "Stevie", "Morgan"
];

const AgentCreator = () => {
  const simulation = useSimulation();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [backstory, setBackstory] = useState('');
  const [traits, setTraits] = useState({
    friendliness: 0.5,
    aggression: 0.5,
    curiosity: 0.5,
    extraversion: 0.5
  });
  
  // References for button elements
  const friendlyBtnRef = useRef(null);
  const aggressiveBtnRef = useRef(null);
  const shyBtnRef = useRef(null);
  const randomBtnRef = useRef(null);
  const randomizeBtnRef = useRef(null);
  const createBtnRef = useRef(null);

  // Check if simulation context is available
  useEffect(() => {
    console.log("SimulationContext available:", simulation);
    console.log("addAgent function available:", typeof simulation.addAgent === 'function');
  }, [simulation]);

  const handleTraitChange = (trait, value) => {
    setTraits(prev => ({
      ...prev,
      [trait]: parseFloat(value)
    }));
  };

  const handleRandomize = () => {
    console.log("Randomize button clicked");
    
    setTraits({
      friendliness: Math.random(),
      aggression: Math.random(),
      curiosity: Math.random(),
      extraversion: Math.random()
    });
  };

  const getRandomName = () => {
    return popularNames[Math.floor(Math.random() * popularNames.length)];
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    console.log("Form submitted");
    
    if (!name.trim()) {
      alert('Please provide a name for the agent');
      return;
    }
    
    const newAgent = {
      name: name.trim(),
      role: role.trim() || 'Resident',
      backstory: backstory.trim(),
      traits
    };
    
    console.log("Creating new agent:", newAgent);
    
    try {
      const createdAgent = simulation.addAgent(newAgent);
      console.log("Agent created successfully:", createdAgent);
      
      // Reset form
      setName('');
      setRole('');
      setBackstory('');
      setTraits({
        friendliness: 0.5,
        aggression: 0.5,
        curiosity: 0.5,
        extraversion: 0.5
      });
    } catch (error) {
      console.error("Error adding agent:", error);
      alert("There was an error creating the agent. Please try again.");
    }
  };

  // Simplified quick create function
  const createPresetAgent = (preset) => {
    console.log("Quick create clicked:", preset);
    
    // Generate a random popular name
    const randomName = getRandomName();
    let newAgent = {};
    
    if (preset === 'friendly') {
      newAgent = {
        name: randomName,
        role: 'Friendly Neighbor',
        backstory: 'Always looking to help others and make new friends.',
        traits: {
          friendliness: 0.9,
          aggression: 0.1,
          curiosity: 0.7,
          extraversion: 0.8
        }
      };
    } 
    else if (preset === 'aggressive') {
      newAgent = {
        name: randomName,
        role: 'Troublemaker',
        backstory: 'Has a chip on their shoulder and always looking for conflict.',
        traits: {
          friendliness: 0.2,
          aggression: 0.9,
          curiosity: 0.5,
          extraversion: 0.7
        }
      };
    }
    else if (preset === 'shy') {
      newAgent = {
        name: randomName,
        role: 'Observer',
        backstory: 'Prefers to keep to themselves but has deep thoughts.',
        traits: {
          friendliness: 0.6,
          aggression: 0.2,
          curiosity: 0.8,
          extraversion: 0.2
        }
      };
    }
    else if (preset === 'random') {
      newAgent = {
        name: randomName,
        role: ['Resident', 'Visitor', 'Worker', 'Student', 'Researcher'][Math.floor(Math.random() * 5)],
        backstory: 'A mysterious individual with an unknown past.',
        traits: {
          friendliness: Math.random(),
          aggression: Math.random(),
          curiosity: Math.random(),
          extraversion: Math.random()
        }
      };
    }
    else {
      console.error("Unknown preset:", preset);
      return;
    }
    
    console.log("Creating preset agent:", newAgent);
    
    try {
      simulation.addAgent(newAgent);
      console.log("Quick create agent added successfully");
    } catch (error) {
      console.error("Error during quick create:", error);
      alert("There was an error creating the agent. Please try again.");
    }
  };

  return (
    <div className="agent-creator" style={{ position: 'relative', zIndex: 10 }}>
      <h2>Create New Agent</h2>
      
      <div className="quick-create">
        <h3>Quick Create</h3>
        <div className="quick-buttons">
          <button 
            type="button" 
            ref={friendlyBtnRef}
            onClick={() => createPresetAgent('friendly')}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            Friendly
          </button>
          <button 
            type="button" 
            ref={aggressiveBtnRef}
            onClick={() => createPresetAgent('aggressive')}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            Aggressive
          </button>
          <button 
            type="button" 
            ref={shyBtnRef}
            onClick={() => createPresetAgent('shy')}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            Shy
          </button>
          <button 
            type="button" 
            ref={randomBtnRef}
            onClick={() => createPresetAgent('random')}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            Random
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter agent name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="role">Role:</label>
          <input
            type="text"
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Enter agent role (optional)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="backstory">Backstory:</label>
          <textarea
            id="backstory"
            value={backstory}
            onChange={(e) => setBackstory(e.target.value)}
            placeholder="Enter agent backstory (optional)"
            rows="3"
          ></textarea>
        </div>
        
        <div className="traits-section">
          <div className="traits-header">
            <h3>Personality Traits</h3>
            <button 
              type="button" 
              ref={randomizeBtnRef}
              onClick={handleRandomize} 
              className="randomize-btn"
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            >
              Randomize
            </button>
          </div>
          
          <div className="trait-sliders">
            {Object.entries(traits).map(([trait, value]) => (
              <div key={trait} className="trait-slider">
                <label htmlFor={`trait-${trait}`}>
                  {trait.charAt(0).toUpperCase() + trait.slice(1)}:
                </label>
                <input
                  type="range"
                  id={`trait-${trait}`}
                  min="0"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={(e) => handleTraitChange(trait, e.target.value)}
                />
                <span className="trait-value">{Math.round(value * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
        
        <button 
          type="submit" 
          ref={createBtnRef}
          className="create-btn"
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          Create Agent
        </button>
      </form>
    </div>
  );
};

export default AgentCreator;
