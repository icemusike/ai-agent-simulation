import React, { createContext, useContext, useState, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';

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

export function SimulationProvider({ children }) {
  const [state, dispatch] = useReducer(simulationReducer, initialState);

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
    removeItem
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
