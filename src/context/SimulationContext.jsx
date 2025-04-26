import React, { createContext, useContext, useState, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const SimulationContext = createContext();

const initialState = {
  agents: [],
  messages: [],
  relationships: {},
  locations: {},
  items: [],
  conversationHistory: {}, // Store conversation history between agent pairs
  rooms: [{
    id: 'main',
    name: 'Main Room',
    description: 'The default simulation room.',
    storyboard: null
  }],
  activeRoom: 'main'
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
          [action.payload.id]: action.payload.location || state.activeRoom
        },
        conversationHistory: {
          ...state.conversationHistory,
          [action.payload.id]: {}
        }
      };
      
    case 'REMOVE_AGENT':
      // Create a new conversationHistory object without the removed agent
      const newConversationHistory = { ...state.conversationHistory };
      delete newConversationHistory[action.payload];
      
      // Also remove this agent from other agents' conversation histories
      Object.keys(newConversationHistory).forEach(agentId => {
        if (newConversationHistory[agentId][action.payload]) {
          delete newConversationHistory[agentId][action.payload];
        }
      });
      
      return {
        ...state,
        agents: state.agents.filter(agent => agent.id !== action.payload),
        messages: state.messages.filter(
          msg => msg.senderId !== action.payload && msg.receiverId !== action.payload
        ),
        conversationHistory: newConversationHistory
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
      // Update conversation history when adding a message
      const senderId = action.payload.senderId;
      const receiverId = action.payload.receiverId;
      
      // Get existing conversation history or initialize empty array
      const existingHistory = state.conversationHistory[senderId]?.[receiverId] || [];
      
      // Add new message to history
      const updatedHistory = [
        ...existingHistory,
        {
          sender: senderId,
          content: action.payload.content,
          timestamp: action.payload.timestamp,
          type: action.payload.type
        }
      ];
      
      // Limit history to last 10 messages to prevent prompt from getting too long
      const limitedHistory = updatedHistory.slice(-10);
      
      return {
        ...state,
        messages: [...state.messages, action.payload],
        conversationHistory: {
          ...state.conversationHistory,
          [senderId]: {
            ...state.conversationHistory[senderId],
            [receiverId]: limitedHistory
          },
          [receiverId]: {
            ...state.conversationHistory[receiverId],
            [senderId]: limitedHistory
          }
        }
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
      
    case 'ADD_ROOM':
      return {
        ...state,
        rooms: [...state.rooms, action.payload]
      };
      
    case 'REMOVE_ROOM':
      // Don't allow removing the main room
      if (action.payload === 'main') {
        return state;
      }
      
      // Move all agents in this room to the main room
      const updatedLocations = { ...state.locations };
      Object.keys(updatedLocations).forEach(agentId => {
        if (updatedLocations[agentId] === action.payload) {
          updatedLocations[agentId] = 'main';
        }
      });
      
      return {
        ...state,
        rooms: state.rooms.filter(room => room.id !== action.payload),
        locations: updatedLocations,
        activeRoom: state.activeRoom === action.payload ? 'main' : state.activeRoom
      };
      
    case 'SET_ACTIVE_ROOM':
      return {
        ...state,
        activeRoom: action.payload
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
      createdAt: new Date().toISOString(),
      location: state.activeRoom
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
    return state.locations[agentId] || state.activeRoom;
  };

  const getAgentsInLocation = (location) => {
    return state.agents.filter(agent => getAgentLocation(agent.id) === location);
  };

  // Get conversation history between two agents
  const getConversationHistory = (agent1Id, agent2Id) => {
    return state.conversationHistory[agent1Id]?.[agent2Id] || [];
  };

  // Format conversation history for inclusion in prompts
  const formatConversationHistory = (agent1Id, agent2Id) => {
    const history = getConversationHistory(agent1Id, agent2Id);
    
    if (history.length === 0) {
      return "You have not spoken with this agent before.";
    }
    
    const agent1 = state.agents.find(a => a.id === agent1Id);
    const agent2 = state.agents.find(a => a.id === agent2Id);
    
    if (!agent1 || !agent2) return "";
    
    const formattedHistory = history.map(msg => {
      const speaker = msg.sender === agent1Id ? agent1.name : agent2.name;
      return `${speaker}: "${msg.content}"`;
    }).join("\n");
    
    return `Previous conversation history with ${agent2.name}:\n${formattedHistory}`;
  };

  // Add a new room
  const addRoom = (room) => {
    const newRoom = {
      ...room,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_ROOM', payload: newRoom });
    return newRoom;
  };

  // Remove a room
  const removeRoom = (roomId) => {
    dispatch({ type: 'REMOVE_ROOM', payload: roomId });
  };

  // Set the active room
  const setActiveRoom = (roomId) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: roomId });
  };

  // Generate a storyboard for a room using OpenAI
  const generateRoomStoryboard = async (roomName, description, roles, agentCount) => {
    if (!openai) {
      return null; // Return null if OpenAI is not initialized
    }

    try {
      // Create a detailed prompt for storyboard generation
      const prompt = createStoryboardPrompt(roomName, description, roles, agentCount);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      });

      const storyboardText = response.choices[0].message.content.trim();
      
      // Generate agents based on the storyboard
      const agentsPrompt = createAgentsPrompt(roomName, description, roles, storyboardText, agentCount);
      
      const agentsResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: agentsPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      let agents = [];
      try {
        const agentsData = JSON.parse(agentsResponse.choices[0].message.content);
        agents = agentsData.agents.map(agent => ({
          name: agent.name,
          role: agent.role,
          backstory: agent.backstory,
          traits: {
            friendliness: parseFloat(agent.traits.friendliness),
            aggression: parseFloat(agent.traits.aggression),
            curiosity: parseFloat(agent.traits.curiosity),
            extraversion: parseFloat(agent.traits.extraversion)
          }
        }));
      } catch (error) {
        console.error("Error parsing agents JSON:", error);
        // Fallback to default agents if parsing fails
        return null;
      }

      return {
        storyboard: storyboardText,
        agents
      };
    } catch (error) {
      console.error("Error generating room storyboard:", error);
      return null;
    }
  };

  // Create a prompt for storyboard generation
  const createStoryboardPrompt = (roomName, description, roles, agentCount) => {
    return `You are a creative narrative designer tasked with creating a detailed storyboard for a simulation room called "${roomName}".

Room Description: ${description}

Available Roles: ${roles.join(', ')}

Number of Agents: ${agentCount}

Create a detailed storyboard that:
1. Establishes the setting and atmosphere of the room
2. Outlines potential relationships, conflicts, and dynamics between agents
3. Suggests interesting scenarios that might unfold during the simulation
4. Creates a cohesive narrative framework for the agents to interact within

The storyboard should be detailed but concise (300-500 words), focusing on creating an engaging scenario that will lead to interesting interactions between the agents.

Only respond with the storyboard text, nothing else.`;
  };

  // Create a prompt for generating agents based on the storyboard
  const createAgentsPrompt = (roomName, description, roles, storyboard, agentCount) => {
    return `You are an AI character designer tasked with creating ${agentCount} unique agents for a simulation room called "${roomName}".

Room Description: ${description}

Available Roles: ${roles.join(', ')}

Storyboard: ${storyboard}

Create ${agentCount} unique agents with distinct personalities that would fit into this scenario. Each agent should have:
1. A name (common human names)
2. A role from the available roles list
3. A brief backstory (1-2 sentences)
4. Personality traits on a scale from 0.0 to 1.0:
   - friendliness (how warm and friendly they are)
   - aggression (how confrontational they are)
   - curiosity (how interested they are in exploring and learning)
   - extraversion (how outgoing and social they are)

Ensure the agents have diverse personalities that will create interesting dynamics based on the storyboard.

Respond with a JSON object containing an array of agents with the following structure:
{
  "agents": [
    {
      "name": "Name",
      "role": "Role",
      "backstory": "Brief backstory",
      "traits": {
        "friendliness": 0.X,
        "aggression": 0.X,
        "curiosity": 0.X,
        "extraversion": 0.X
      }
    },
    ...
  ]
}`;
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
    const conversationHistory = formatConversationHistory(initiator.id, responder.id);
    
    return `You are ${initiator.name}, a ${initiator.role} with the following personality traits: ${initiatorPersonality}.
    
You are speaking to ${responder.name}, a ${responder.role} with these traits: ${responderPersonality}.

Your relationship with ${responder.name} is: ${relationshipDescription}.

${conversationHistory}

Generate a ${interactionType} message from you to ${responder.name}. The message should reflect your personality, your relationship with ${responder.name}, and should be ${interactionType} in tone.

If you have spoken before, your message should acknowledge or reference your previous conversations in a natural way. Continue the conversation where you left off if appropriate.

Keep the message concise (1-2 sentences) and make it sound natural. Include ${responder.name} in your message.

Only respond with the message text, nothing else.`;
  };

  // Create a detailed prompt for response generation
  const createResponsePrompt = (responder, initiator, initialInteractionType, relationship) => {
    const relationshipDescription = getRelationshipDescription(relationship);
    const responderPersonality = getPersonalityDescription(responder);
    const initiatorPersonality = getPersonalityDescription(initiator);
    const conversationHistory = formatConversationHistory(responder.id, initiator.id);
    
    return `You are ${responder.name}, a ${responder.role} with the following personality traits: ${responderPersonality}.
    
${initiator.name}, a ${initiator.role} with these traits: ${initiatorPersonality}, just spoke to you in a ${initialInteractionType} tone.

Your relationship with ${initiator.name} is: ${relationshipDescription}.

${conversationHistory}

Generate a response to ${initiator.name}. Your response should reflect your personality and your relationship with ${initiator.name}.

If you have spoken before, your response should acknowledge or reference your previous conversations in a natural way. Continue the conversation where you left off if appropriate.

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
    rooms: state.rooms,
    activeRoom: state.activeRoom,
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
    addRoom,
    removeRoom,
    setActiveRoom,
    hasOpenAI: !!openai,
    generateAIMessage,
    generateAIResponse,
    getConversationHistory,
    generateRoomStoryboard
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
