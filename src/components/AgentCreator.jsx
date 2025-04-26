import React, { useState } from 'react';
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
  const { addAgent } = useSimulation();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [backstory, setBackstory] = useState('');
  const [traits, setTraits] = useState({
    friendliness: 0.5,
    aggression: 0.5,
    curiosity: 0.5,
    extraversion: 0.5
  });

  const handleTraitChange = (trait, value) => {
    setTraits(prev => ({
      ...prev,
      [trait]: parseFloat(value)
    }));
  };

  const handleRandomize = () => {
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
    e.preventDefault();
    
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
    
    addAgent(newAgent);
    
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
  };

  const handleQuickCreate = (preset) => {
    let newAgent = {
      name: '',
      role: '',
      backstory: '',
      traits: {
        friendliness: 0.5,
        aggression: 0.5,
        curiosity: 0.5,
        extraversion: 0.5
      }
    };
    
    // Generate a random popular name
    const randomName = getRandomName();
    
    switch(preset) {
      case 'friendly':
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
        break;
      case 'aggressive':
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
        break;
      case 'shy':
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
        break;
      case 'random':
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
        break;
    }
    
    addAgent(newAgent);
  };

  return (
    <div className="agent-creator">
      <h2>Create New Agent</h2>
      
      <div className="quick-create">
        <h3>Quick Create</h3>
        <div className="quick-buttons">
          <button onClick={() => handleQuickCreate('friendly')}>Friendly</button>
          <button onClick={() => handleQuickCreate('aggressive')}>Aggressive</button>
          <button onClick={() => handleQuickCreate('shy')}>Shy</button>
          <button onClick={() => handleQuickCreate('random')}>Random</button>
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
            <button type="button" onClick={handleRandomize} className="randomize-btn">
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
        
        <button type="submit" className="create-btn">Create Agent</button>
      </form>
    </div>
  );
};

export default AgentCreator;
