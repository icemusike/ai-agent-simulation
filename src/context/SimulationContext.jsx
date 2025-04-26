import React, { createContext, useContext, useState, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const SimulationContext = createContext();

const initialState = {
  agents: [],
  messages: [],
  relationships: {},
  locations: {},
  items: []
};

function simulationReducer(state, action) {
  switch (action.type) {
    case 'ADD_AGENT':
      return {
        ...state,
        agents: [...state.agents, action.payload],
        relationships: {
          ...state.relationships,
          [action.payload.id]: {}
        },
        locations: {
          ...state.locations,
          [action.payload.id]: 'main'
        }
      };
      
    case 'REMOVE_AGENT':
      return {
        ...state,
        agents: state.agents.filter(agent => agent.id !== action.payload),
        messages: state.messages.filter(
          msg => msg.senderId !== action.payload && msg.receiverId !== action.payload
        )
      };
      
    case 'UPDATE_AGENT':
      return {
        ...state,
        agents: state.agents.map(agent => 
          agent.id === action.payload.id 
            ? { ...agent, ...action.payload.updates }
            : agent
        )
      };
      
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
      
    case 'UPDATE_RELATIONSHIP':
      return {
        ...state,
        relationships: {
          ...state.relationships,
          [action.payload.agent1Id]: {
            ...state.relationships[action.payload.agent1Id],
            [action.payload.agent2Id]: action.payload.value
          }
        }
      };
      
    case 'MOVE_AGENT':
      return {
        ...state,
        locations: {
          ...state.locations,
          [action.payload.agentId]: action.payload.location
        }
      };
      
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload]
      };
      
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
      
    default:
      return state;
  }
}

export function SimulationProvider({ children, openAIKey }) {
  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const [openai, setOpenai] = useState(() => {
    if (openAIKey) {
      try {
        return new OpenAI({
          apiKey: openAIKey,
          dangerouslyAllowBrowser: true
        });
      } catch (error) {
        console.error("Error initializing OpenAI:", error);
        return null;
      }
    }
    return null;
  });

  // Update OpenAI client when API key changes
  React.useEffect(() => {
    if (openAIKey) {
      try {
        setOpenai(new OpenAI({
          apiKey: openAIKey,
          dangerouslyAllowBrowser: true
        }));
      } catch (error) {
        console.error("Error updating OpenAI client:", error);
        setOpenai(null);
      }
    } else {
      setOpenai(null);
    }
  }, [openAIKey]);

  const addAgent = (agent) => {
    const newAgent = {
      ...agent,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_AGENT', payload: newAgent });
    return newAgent;
  };

  const removeAgent = (agentId) => {
    dispatch({ type: 'REMOVE_AGENT', payload: agentId });
  };

  const updateAgent = (agentId, updates) => {
    dispatch({ 
      type: 'UPDATE_AGENT', 
      payload: { id: agentId, updates } 
    });
  };

  const addMessage = (message) => {
    const newMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
    return newMessage;
  };

  const updateRelationship = (agent1Id, agent2Id, value) => {
    dispatch({
      type: 'UPDATE_RELATIONSHIP',
      payload: { agent1Id, agent2Id, value }
    });
  };

  const moveAgent = (agentId, location) => {
    dispatch({
      type: 'MOVE_AGENT',
      payload: { agentId, location }
    });
  };

  const addItem = (item) => {
    const newItem = {
      ...item,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_ITEM', payload: newItem });
    return newItem;
  };

  const removeItem = (itemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const getRelationship = (agent1Id, agent2Id) => {
    if (state.relationships[agent1Id] && state.relationships[agent1Id][agent2Id] !== undefined) {
      return state.relationships[agent1Id][agent2Id];
    }
    return 0; // Neutral by default
  };

  const getAgentLocation = (agentId) => {
    return state.locations[agentId] || 'main';
  };

  const getAgentsInLocation = (location) => {
    return state.agents.filter(agent => getAgentLocation(agent.id) === location);
  };

  // Generate message using OpenAI
  const generateAIMessage = async (initiator, responder, interactionType, relationship) => {
    if (!openai) {
      return null; // Return null if OpenAI is not initialized
    }

    try {
      // Create a detailed prompt based on agent personalities and relationship
      const prompt = createMessagePrompt(initiator, responder, interactionType, relationship);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating AI message:", error);
      return null;
    }
  };

  // Generate response using OpenAI
  const generateAIResponse = async (responder, initiator, initialInteractionType, relationship) => {
    if (!openai) {
      return null; // Return null if OpenAI is not initialized
    }

    try {
      // Create a detailed prompt based on agent personalities and relationship
      const prompt = createResponsePrompt(responder, initiator, initialInteractionType, relationship);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating AI response:", error);
      return null;
    }
  };

  // Create a detailed prompt for message generation
  const createMessagePrompt = (initiator, responder, interactionType, relationship) => {
    const relationshipDescription = getRelationshipDescription(relationship);
    const initiatorPersonality = getPersonalityDescription(initiator);
    const responderPersonality = getPersonalityDescription(responder);
    
    return `You are ${initiator.name}, a ${initiator.role} with the following personality traits: ${initiatorPersonality}.
    
You are speaking to ${responder.name}, a ${responder.role} with these traits: ${responderPersonality}.

Your relationship with ${responder.name} is: ${relationshipDescription}.

Generate a ${interactionType} message from you to ${responder.name}. The message should reflect your personality, your relationship with ${responder.name}, and should be ${interactionType} in tone.

Keep the message concise (1-2 sentences) and make it sound natural. Include ${responder.name} in your message.

Only respond with the message text, nothing else.`;
  };

  // Create a detailed prompt for response generation
  const createResponsePrompt = (responder, initiator, initialInteractionType, relationship) => {
    const relationshipDescription = getRelationshipDescription(relationship);
    const responderPersonality = getPersonalityDescription(responder);
    const initiatorPersonality = getPersonalityDescription(initiator);
    
    return `You are ${responder.name}, a ${responder.role} with the following personality traits: ${responderPersonality}.
    
${initiator.name}, a ${initiator.role} with these traits: ${initiatorPersonality}, just spoke to you in a ${initialInteractionType} tone.

Your relationship with ${initiator.name} is: ${relationshipDescription}.

Generate a response to ${initiator.name}. Your response should reflect your personality and your relationship with ${initiator.name}.

Keep the response concise (1-2 sentences) and make it sound natural. Include ${initiator.name} in your response.

Only respond with the message text, nothing else.`;
  };

  // Helper function to describe personality
  const getPersonalityDescription = (agent) => {
    const traits = [];
    
    if (agent.traits.friendliness > 0.7) traits.push("very friendly");
    else if (agent.traits.friendliness > 0.5) traits.push("somewhat friendly");
    else if (agent.traits.friendliness < 0.3) traits.push("unfriendly");
    
    if (agent.traits.aggression > 0.7) traits.push("highly aggressive");
    else if (agent.traits.aggression > 0.5) traits.push("somewhat aggressive");
    else if (agent.traits.aggression < 0.3) traits.push("non-aggressive");
    
    if (agent.traits.curiosity > 0.7) traits.push("very curious");
    else if (agent.traits.curiosity > 0.5) traits.push("somewhat curious");
    else if (agent.traits.curiosity < 0.3) traits.push("incurious");
    
    if (agent.traits.extraversion > 0.7) traits.push("highly extraverted");
    else if (agent.traits.extraversion > 0.5) traits.push("somewhat extraverted");
    else if (agent.traits.extraversion < 0.3) traits.push("introverted");
    
    return traits.join(", ");
  };

  // Helper function to describe relationship
  const getRelationshipDescription = (value) => {
    if (value > 75) return "very close friends";
    if (value > 50) return "friends";
    if (value > 25) return "friendly acquaintances";
    if (value > -25) return "neutral acquaintances";
    if (value > -50) return "dislike each other";
    if (value > -75) return "enemies";
    return "bitter enemies";
  };

  const value = {
    agents: state.agents,
    messages: state.messages,
    items: state.items,
    addAgent,
    removeAgent,
    updateAgent,
    addMessage,
    updateRelationship,
    getRelationship,
    moveAgent,
    getAgentLocation,
    getAgentsInLocation,
    addItem,
    removeItem,
    hasOpenAI: !!openai,
    generateAIMessage,
    generateAIResponse
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
