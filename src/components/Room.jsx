import React, { useState, useEffect, useRef } from 'react';
import { useSimulation } from '../context/SimulationContext';
import Agent from './Agent';
import MessageLog from './MessageLog';
import InteractionVisualizer from './InteractionVisualizer';
import './Room.css';

const Room = ({ isRunning }) => {
  const { 
    agents, 
    messages, 
    addMessage, 
    getRelationship, 
    updateRelationship,
    getAgentsInLocation,
    updateAgent,
    hasOpenAI,
    generateAIMessage,
    generateAIResponse,
    rooms,
    activeRoom,
    setActiveRoom
  } = useSimulation();
  
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const simulationInterval = useRef(null);
  const messageLogRef = useRef(null);
  const roomRef = useRef(null);
  const agentRefs = useRef({});
  const agentPositions = useRef({});
  const agentVelocities = useRef({});
  const interactionCooldowns = useRef({});

  // Get agents in the current location
  const locationAgents = getAgentsInLocation(activeRoom);
  
  // Get current room data
  const currentRoom = rooms.find(room => room.id === activeRoom) || rooms[0];

  // Reset agent positions when changing rooms
  useEffect(() => {
    // Clear positions for agents that are no longer in the room
    Object.keys(agentPositions.current).forEach(agentId => {
      if (!locationAgents.some(agent => agent.id === agentId)) {
        delete agentPositions.current[agentId];
        delete agentVelocities.current[agentId];
      }
    });
    
    // Reset interaction cooldowns
    interactionCooldowns.current = {};
    
    // Initialize new positions in the next render cycle
  }, [activeRoom, locationAgents]);

  // Initialize agent positions and velocities
  useEffect(() => {
    if (roomRef.current && locationAgents.length > 0) {
      const roomWidth = roomRef.current.clientWidth;
      const roomHeight = roomRef.current.clientHeight;
      
      locationAgents.forEach(agent => {
        // Only initialize position if not already set
        if (!agentPositions.current[agent.id]) {
          agentPositions.current[agent.id] = {
            x: Math.random() * (roomWidth - 60),
            y: Math.random() * (roomHeight - 60)
          };
          
          // Random velocity between -2 and 2
          agentVelocities.current[agent.id] = {
            x: (Math.random() * 4 - 2),
            y: (Math.random() * 4 - 2)
          };
          
          interactionCooldowns.current[agent.id] = {};
        }
      });
    }
  }, [locationAgents, roomRef.current]);

  // Animation loop for agent movement
  useEffect(() => {
    let animationFrameId;
    
    const updateAgentPositions = () => {
      if (!roomRef.current || !isRunning) return;
      
      const roomWidth = roomRef.current.clientWidth;
      const roomHeight = roomRef.current.clientHeight;
      
      // Update positions based on velocities
      Object.keys(agentPositions.current).forEach(agentId => {
        const position = agentPositions.current[agentId];
        const velocity = agentVelocities.current[agentId];
        
        if (!position || !velocity) return;
        
        // Update position
        position.x += velocity.x;
        position.y += velocity.y;
        
        // Bounce off walls
        if (position.x <= 0 || position.x >= roomWidth - 60) {
          velocity.x *= -1;
          position.x = Math.max(0, Math.min(position.x, roomWidth - 60));
        }
        
        if (position.y <= 0 || position.y >= roomHeight - 60) {
          velocity.y *= -1;
          position.y = Math.max(0, Math.min(position.y, roomHeight - 60));
        }
        
        // Update sprite position
        if (agentRefs.current[agentId]) {
          agentRefs.current[agentId].style.left = `${position.x}px`;
          agentRefs.current[agentId].style.top = `${position.y}px`;
          
          // Set sprite direction based on velocity
          if (velocity.x > 0) {
            agentRefs.current[agentId].classList.add('facing-right');
            agentRefs.current[agentId].classList.remove('facing-left');
          } else if (velocity.x < 0) {
            agentRefs.current[agentId].classList.add('facing-left');
            agentRefs.current[agentId].classList.remove('facing-right');
          }
        }
      });
      
      // Check for collisions and trigger interactions
      checkCollisions();
      
      animationFrameId = requestAnimationFrame(updateAgentPositions);
    };
    
    if (isRunning) {
      animationFrameId = requestAnimationFrame(updateAgentPositions);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isRunning, locationAgents]);

  // Check for collisions between agents
  const checkCollisions = () => {
    if (isGeneratingMessage) return; // Skip collision check if already generating a message
    
    const agentIds = Object.keys(agentPositions.current);
    
    for (let i = 0; i < agentIds.length; i++) {
      const agent1Id = agentIds[i];
      const pos1 = agentPositions.current[agent1Id];
      
      if (!pos1) continue;
      
      for (let j = i + 1; j < agentIds.length; j++) {
        const agent2Id = agentIds[j];
        const pos2 = agentPositions.current[agent2Id];
        
        if (!pos2) continue;
        
        // Check if agents are colliding (simple circle collision)
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If agents are close enough and not on cooldown, trigger interaction
        if (distance < 60) {
          const now = Date.now();
          
          // Initialize cooldown objects if they don't exist
          if (!interactionCooldowns.current[agent1Id]) {
            interactionCooldowns.current[agent1Id] = {};
          }
          if (!interactionCooldowns.current[agent2Id]) {
            interactionCooldowns.current[agent2Id] = {};
          }
          
          const lastInteraction = interactionCooldowns.current[agent1Id][agent2Id] || 0;
          
          // Only allow interaction every 10 seconds between the same agents
          if (now - lastInteraction > 10000) {
            const agent1 = agents.find(a => a.id === agent1Id);
            const agent2 = agents.find(a => a.id === agent2Id);
            
            if (agent1 && agent2) {
              // Trigger interaction
              const relationship = getRelationship(agent1.id, agent2.id);
              generateInteraction(agent1, agent2, relationship);
              
              // Set cooldown
              interactionCooldowns.current[agent1Id][agent2Id] = now;
              interactionCooldowns.current[agent2Id][agent1Id] = now;
            }
          }
        }
      }
    }
  };

  // Auto-scroll message log
  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
    }
  }, [messages]);

  const generateInteraction = async (initiator, responder, relationship) => {
    setIsGeneratingMessage(true);
    
    // Determine interaction type based on personalities and relationship
    let interactionType = 'neutral';
    const randomFactor = Math.random();
    
    // Personality factors influence interaction type
    const initiatorAggression = initiator.traits.aggression || 0.5;
    const responderFriendliness = responder.traits.friendliness || 0.5;
    
    // Relationship affects interaction probability
    if (relationship < -50) {
      // Hostile relationship
      if (randomFactor < initiatorAggression * 0.8) {
        interactionType = 'hostile';
      } else if (randomFactor < 0.9) {
        interactionType = 'neutral';
      } else {
        interactionType = 'friendly';
      }
    } else if (relationship > 50) {
      // Friendly relationship
      if (randomFactor < responderFriendliness * 0.8) {
        interactionType = 'friendly';
      } else if (randomFactor < 0.9) {
        interactionType = 'neutral';
      } else {
        interactionType = 'hostile';
      }
    } else {
      // Neutral relationship
      if (randomFactor < 0.3) {
        interactionType = 'hostile';
      } else if (randomFactor < 0.7) {
        interactionType = 'neutral';
      } else {
        interactionType = 'friendly';
      }
    }
    
    // Generate message content based on interaction type
    let content = '';
    let relationshipChange = 0;
    
    // Try to use OpenAI if available
    if (hasOpenAI) {
      try {
        const aiMessage = await generateAIMessage(initiator, responder, interactionType, relationship);
        if (aiMessage) {
          content = aiMessage;
        } else {
          // Fallback to predefined messages if AI generation fails
          content = generateFallbackMessage(initiator, responder, interactionType);
        }
      } catch (error) {
        console.error("Error generating AI message:", error);
        content = generateFallbackMessage(initiator, responder, interactionType);
      }
    } else {
      content = generateFallbackMessage(initiator, responder, interactionType);
    }
    
    // Determine relationship change based on interaction type
    switch (interactionType) {
      case 'friendly':
        relationshipChange = Math.floor(Math.random() * 10) + 5; // +5 to +15
        break;
      case 'hostile':
        relationshipChange = -1 * (Math.floor(Math.random() * 10) + 5); // -5 to -15
        break;
      default:
        relationshipChange = Math.floor(Math.random() * 6) - 2; // -2 to +3
    }
    
    // Show speech bubble
    showSpeechBubble(initiator.id, content, interactionType);
    
    // Add the message to the log
    addMessage({
      senderId: initiator.id,
      receiverId: responder.id,
      content,
      type: interactionType
    });
    
    // Update relationship in both directions
    updateRelationship(initiator.id, responder.id, relationship + relationshipChange);
    updateRelationship(responder.id, initiator.id, relationship + relationshipChange);
    
    // Generate a response after a short delay
    setTimeout(() => {
      generateResponse(responder, initiator, interactionType, relationship + relationshipChange);
    }, 2000);
  };

  const generateResponse = async (responder, initiator, initialInteractionType, updatedRelationship) => {
    // Determine response type based on initial interaction and personality
    let responseType = 'neutral';
    const randomFactor = Math.random();
    const responderAggression = responder.traits.aggression || 0.5;
    const responderFriendliness = responder.traits.friendliness || 0.5;
    
    if (initialInteractionType === 'friendly') {
      if (randomFactor < responderFriendliness * 0.8) {
        responseType = 'friendly';
      } else if (randomFactor < 0.9) {
        responseType = 'neutral';
      } else {
        responseType = 'hostile';
      }
    } else if (initialInteractionType === 'hostile') {
      if (randomFactor < responderAggression * 0.8) {
        responseType = 'hostile';
      } else if (randomFactor < 0.9) {
        responseType = 'neutral';
      } else {
        responseType = 'friendly';
      }
    } else {
      // Neutral initial interaction
      if (randomFactor < 0.3) {
        responseType = 'hostile';
      } else if (randomFactor < 0.7) {
        responseType = 'neutral';
      } else {
        responseType = 'friendly';
      }
    }
    
    // Generate response content
    let content = '';
    let relationshipChange = 0;
    
    // Try to use OpenAI if available
    if (hasOpenAI) {
      try {
        const aiResponse = await generateAIResponse(responder, initiator, initialInteractionType, updatedRelationship);
        if (aiResponse) {
          content = aiResponse;
        } else {
          // Fallback to predefined responses if AI generation fails
          content = generateFallbackResponse(responder, initiator, initialInteractionType, responseType);
        }
      } catch (error) {
        console.error("Error generating AI response:", error);
        content = generateFallbackResponse(responder, initiator, initialInteractionType, responseType);
      }
    } else {
      content = generateFallbackResponse(responder, initiator, initialInteractionType, responseType);
    }
    
    // Determine relationship change based on response type
    switch (responseType) {
      case 'friendly':
        relationshipChange = Math.floor(Math.random() * 8) + 3; // +3 to +10
        break;
      case 'hostile':
        relationshipChange = -1 * (Math.floor(Math.random() * 8) + 3); // -3 to -10
        break;
      default:
        relationshipChange = Math.floor(Math.random() * 4) - 1; // -1 to +2
    }
    
    // Show speech bubble
    showSpeechBubble(responder.id, content, responseType);
    
    // Add the response message
    addMessage({
      senderId: responder.id,
      receiverId: initiator.id,
      content,
      type: responseType
    });
    
    // Update relationship again based on the response
    updateRelationship(initiator.id, responder.id, updatedRelationship + relationshipChange);
    updateRelationship(responder.id, initiator.id, updatedRelationship + relationshipChange);
    
    // Reset the generating message flag
    setIsGeneratingMessage(false);
  };

  // Show speech bubble above agent
  const showSpeechBubble = (agentId, content, type) => {
    if (!agentRefs.current[agentId]) return;
    
    const bubble = document.createElement('div');
    bubble.className = `speech-bubble ${type}`;
    bubble.textContent = content;
    
    // Append to agent sprite
    agentRefs.current[agentId].appendChild(bubble);
    
    // Remove after 4 seconds
    setTimeout(() => {
      if (bubble.parentNode) {
        bubble.parentNode.removeChild(bubble);
      }
    }, 4000);
  };

  // Fallback message generation functions
  const generateFallbackMessage = (initiator, responder, interactionType) => {
    switch (interactionType) {
      case 'friendly':
        return generateFriendlyInteraction(initiator, responder);
      case 'hostile':
        return generateHostileInteraction(initiator, responder);
      default:
        return generateNeutralInteraction(initiator, responder);
    }
  };

  const generateFallbackResponse = (responder, initiator, initialInteractionType, responseType) => {
    switch (responseType) {
      case 'friendly':
        return generateFriendlyResponse(responder, initiator, initialInteractionType);
      case 'hostile':
        return generateHostileResponse(responder, initiator, initialInteractionType);
      default:
        return generateNeutralResponse(responder, initiator, initialInteractionType);
    }
  };

  // Helper functions to generate different types of interactions
  const generateFriendlyInteraction = (initiator, responder) => {
    const friendlyInteractions = [
      `Hey ${responder.name}, how are you doing today? You're looking great!`,
      `${responder.name}! Just the person I wanted to see. I've been thinking about our last conversation.`,
      `I really appreciate your perspective, ${responder.name}. You always have such insightful thoughts.`,
      `${responder.name}, would you like to collaborate on something together? I value your input.`,
      `I brought you something I thought you might like, ${responder.name}.`
    ];
    
    return friendlyInteractions[Math.floor(Math.random() * friendlyInteractions.length)];
  };

  const generateHostileInteraction = (initiator, responder) => {
    const hostileInteractions = [
      `${responder.name}, you're really getting on my nerves today.`,
      `I don't appreciate your attitude, ${responder.name}. Back off.`,
      `${responder.name}, stay out of my way if you know what's good for you.`,
      `You think you're so clever, don't you ${responder.name}?`,
      `${responder.name}, I've had enough of your nonsense!`
    ];
    
    return hostileInteractions[Math.floor(Math.random() * hostileInteractions.length)];
  };

  const generateNeutralInteraction = (initiator, responder) => {
    const neutralInteractions = [
      `${responder.name}, have you seen what's happening outside?`,
      `Excuse me, ${responder.name}, do you have a moment to talk?`,
      `${responder.name}, what do you think about the current situation?`,
      `I noticed you were busy, ${responder.name}. Is now a good time?`,
      `${responder.name}, I have a question about something.`
    ];
    
    return neutralInteractions[Math.floor(Math.random() * neutralInteractions.length)];
  };

  const generateFriendlyResponse = (responder, initiator, initialType) => {
    const friendlyResponses = {
      friendly: [
        `${initiator.name}, it's always a pleasure talking with you! I'm doing great, thanks for asking.`,
        `I've been looking forward to seeing you too, ${initiator.name}! What's on your mind?`,
        `That means a lot coming from you, ${initiator.name}. I value our friendship.`,
        `I'd love to collaborate with you, ${initiator.name}! What did you have in mind?`,
        `That's so thoughtful of you, ${initiator.name}! Thank you!`
      ],
      hostile: [
        `Hey ${initiator.name}, I think we got off on the wrong foot. Can we start over?`,
        `I understand you're upset, ${initiator.name}, but I'd rather we try to get along.`,
        `${initiator.name}, despite our differences, I respect you and want to find common ground.`,
        `Let's not fight, ${initiator.name}. We can work this out peacefully.`,
        `${initiator.name}, I choose not to engage with negativity. How about we talk about something positive?`
      ],
      neutral: [
        `It's good to see you, ${initiator.name}! What can I help you with?`,
        `${initiator.name}, I was just thinking about you! How have you been?`,
        `I'm always happy to chat with you, ${initiator.name}.`,
        `${initiator.name}, your timing is perfect. I was hoping to talk to you.`,
        `Yes, ${initiator.name}, I'd love to hear what's on your mind.`
      ]
    };
    
    const responses = friendlyResponses[initialType] || friendlyResponses.neutral;
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateHostileResponse = (responder, initiator, initialType) => {
    const hostileResponses = {
      friendly: [
        `${initiator.name}, spare me your fake friendliness. I know what you're really like.`,
        `Don't pretend to be nice to me, ${initiator.name}. I'm not falling for it.`,
        `${initiator.name}, I don't have time for your insincere pleasantries.`,
        `Collaborate with you, ${initiator.name}? I'd rather work alone.`,
        `I don't need your gifts or your friendship, ${initiator.name}.`
      ],
      hostile: [
        `You want to start something, ${initiator.name}? Bring it on!`,
        `${initiator.name}, you're the one who should back off before this gets ugly.`,
        `That's rich coming from you, ${initiator.name}. You're the problem here.`,
        `${initiator.name}, you've crossed the line this time.`,
        `I've had enough of you too, ${initiator.name}. This ends now!`
      ],
      neutral: [
        `${initiator.name}, I'm not interested in small talk with you.`,
        `No, ${initiator.name}, I don't have time for you right now.`,
        `${initiator.name}, why don't you mind your own business?`,
        `What I think is none of your concern, ${initiator.name}.`,
        `${initiator.name}, just leave me alone.`
      ]
    };
    
    const responses = hostileResponses[initialType] || hostileResponses.neutral;
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateNeutralResponse = (responder, initiator, initialType) => {
    const neutralResponses = {
      friendly: [
        `Thanks, ${initiator.name}. I'm doing alright.`,
        `Hello ${initiator.name}. What did you want to talk about?`,
        `I appreciate that, ${initiator.name}.`,
        `Perhaps, ${initiator.name}. What kind of collaboration did you have in mind?`,
        `That's considerate of you, ${initiator.name}.`
      ],
      hostile: [
        `${initiator.name}, I think we both need to calm down.`,
        `Let's not make this a bigger issue than it needs to be, ${initiator.name}.`,
        `${initiator.name}, I'd prefer if we could discuss this civilly.`,
        `I'm not looking for trouble, ${initiator.name}.`,
        `${initiator.name}, let's just keep our distance for now.`
      ],
      neutral: [
        `Yes, ${initiator.name}, I noticed. What do you make of it?`,
        `I have a moment, ${initiator.name}. What's up?`,
        `I'm not sure, ${initiator.name}. I haven't given it much thought.`,
        `Now is fine, ${initiator.name}. What did you need?`,
        `What's your question, ${initiator.name}?`
      ]
    };
    
    const responses = neutralResponses[initialType] || neutralResponses.neutral;
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Get agent color based on personality
  const getAgentColor = (agent) => {
    const friendliness = agent.traits.friendliness || 0.5;
    const aggression = agent.traits.aggression || 0.5;
    
    if (friendliness > 0.7 && aggression < 0.3) {
      return 'agent-friendly'; // Friendly and peaceful
    } else if (aggression > 0.7) {
      return 'agent-aggressive'; // Aggressive
    } else if (friendliness < 0.3) {
      return 'agent-cold'; // Cold/unfriendly
    } else {
      return 'agent-neutral'; // Balanced
    }
  };

  return (
    <div className="room-container">
      <div className="room-header">
        <div className="room-selector">
          <label htmlFor="room-select">Select Room:</label>
          <select 
            id="room-select" 
            value={activeRoom}
            onChange={(e) => setActiveRoom(e.target.value)}
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <h2>{currentRoom.name}</h2>
        {currentRoom.storyboard && (
          <button 
            className="storyboard-toggle"
            onClick={() => document.getElementById('storyboard-modal').showModal()}
          >
            View Storyboard
          </button>
        )}
      </div>
      
      {currentRoom.storyboard && (
        <dialog id="storyboard-modal" className="storyboard-modal">
          <div className="storyboard-modal-content">
            <h3>Storyboard: {currentRoom.name}</h3>
            <div className="storyboard-text">
              {currentRoom.storyboard}
            </div>
            <button 
              className="close-storyboard"
              onClick={() => document.getElementById('storyboard-modal').close()}
            >
              Close
            </button>
          </div>
        </dialog>
      )}
      
      <div className="room-content">
        <div className="physical-room" ref={roomRef}>
          {locationAgents.length === 0 ? (
            <div className="empty-room-message">
              <p>No agents in this location. Add some agents to begin the simulation.</p>
            </div>
          ) : (
            locationAgents.map(agent => (
              <div 
                key={agent.id}
                className={`agent-sprite ${getAgentColor(agent)} facing-right`}
                ref={el => agentRefs.current[agent.id] = el}
                title={agent.name}
              >
                <div className="agent-emoji"></div>
                <div className="agent-sprite-name">{agent.name}</div>
              </div>
            ))
          )}
        </div>
        
        <MessageLog 
          messages={messages} 
          agents={agents} 
          location={activeRoom}
          ref={messageLogRef}
        />
      </div>
      
      <div className="simulation-status">
        {isRunning ? (
          <p className="status-running">
            Simulation is running - Agents will interact when they touch
            {hasOpenAI && <span className="ai-status active"> • OpenAI integration active</span>}
          </p>
        ) : (
          <p className="status-paused">
            Simulation is paused - Press Start to begin
            {hasOpenAI && <span className="ai-status active"> • OpenAI integration active</span>}
          </p>
        )}
      </div>
      
      <div className="agent-list-panel">
        <h3>Agents in Room ({locationAgents.length})</h3>
        <div className="agent-list">
          {locationAgents.map(agent => (
            <Agent key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
      
      {/* Add the InteractionVisualizer component */}
      <InteractionVisualizer />
    </div>
  );
};

export default Room;
