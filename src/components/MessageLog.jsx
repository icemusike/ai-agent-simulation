import React, { forwardRef, useMemo } from 'react';
import './MessageLog.css';

const MessageLog = forwardRef(({ messages, agents, location }, ref) => {
  // Debug logging to help identify issues
  console.log("MessageLog - Current location:", location);
  console.log("MessageLog - All messages:", messages);
  console.log("MessageLog - All agents:", agents);
  
  // Filter messages to only show those between agents in the current location
  const locationAgentIds = agents
    .filter(agent => {
      const isInLocation = agent.location === location;
      console.log(`Agent ${agent.name} (${agent.id}) location: ${agent.location}, current location: ${location}, is in location: ${isInLocation}`);
      return isInLocation;
    })
    .map(agent => agent.id);
  
  console.log("MessageLog - Agents in location:", locationAgentIds);
  
  const filteredMessages = messages.filter(msg => {
    const senderInLocation = locationAgentIds.includes(msg.senderId);
    const receiverInLocation = locationAgentIds.includes(msg.receiverId);
    console.log(`Message ${msg.id} - sender in location: ${senderInLocation}, receiver in location: ${receiverInLocation}`);
    return senderInLocation && receiverInLocation;
  });
  
  console.log("MessageLog - Filtered messages:", filteredMessages);
  
  // Organize messages into conversations
  const conversations = useMemo(() => {
    const result = [];
    const processedIds = new Set();
    
    // First pass: find initial messages
    filteredMessages.forEach(message => {
      // Check if this is a response to another message
      const isResponse = filteredMessages.some(m => 
        m.senderId === message.receiverId && 
        m.receiverId === message.senderId && 
        new Date(m.timestamp) < new Date(message.timestamp) &&
        // Check if timestamps are close (within 10 seconds)
        (new Date(message.timestamp) - new Date(m.timestamp)) < 10000
      );
      
      if (!isResponse && !processedIds.has(message.id)) {
        // This is an initial message
        const conversation = {
          initial: message,
          responses: []
        };
        
        // Find direct responses to this message
        filteredMessages.forEach(response => {
          if (
            response.senderId === message.receiverId && 
            response.receiverId === message.senderId &&
            new Date(response.timestamp) > new Date(message.timestamp) &&
            // Check if timestamps are close (within 10 seconds)
            (new Date(response.timestamp) - new Date(message.timestamp)) < 10000
          ) {
            conversation.responses.push(response);
            processedIds.add(response.id);
          }
        });
        
        result.push(conversation);
        processedIds.add(message.id);
      }
    });
    
    // Second pass: add remaining messages that weren't identified as responses
    filteredMessages.forEach(message => {
      if (!processedIds.has(message.id)) {
        result.push({
          initial: message,
          responses: []
        });
        processedIds.add(message.id);
      }
    });
    
    // Sort conversations by the timestamp of the initial message
    return result.sort((a, b) => 
      new Date(a.initial.timestamp) - new Date(b.initial.timestamp)
    );
  }, [filteredMessages]);
  
  const getAgentName = (id) => {
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : 'Unknown Agent';
  };
  
  const getMessageClass = (type) => {
    switch (type) {
      case 'friendly':
        return 'message-friendly';
      case 'hostile':
        return 'message-hostile';
      default:
        return 'message-neutral';
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="message-log" ref={ref}>
      <h3>Conversation Log</h3>
      
      <div className="messages-container">
        {conversations.length === 0 ? (
          <p className="no-messages">No messages yet. Start the simulation to see agents interact.</p>
        ) : (
          conversations.map(conversation => (
            <div key={conversation.initial.id} className="conversation-thread">
              <div 
                className={`message initial-message ${getMessageClass(conversation.initial.type)}`}
              >
                <div className="message-header">
                  <span className="message-sender">{getAgentName(conversation.initial.senderId)}</span>
                  <span className="message-time">{formatTimestamp(conversation.initial.timestamp)}</span>
                </div>
                <div className="message-content">
                  {conversation.initial.content}
                </div>
                <div className="message-recipient">
                  To: {getAgentName(conversation.initial.receiverId)}
                </div>
              </div>
              
              {conversation.responses.map(response => (
                <div 
                  key={response.id} 
                  className={`message response-message ${getMessageClass(response.type)}`}
                >
                  <div className="message-header">
                    <span className="message-sender">{getAgentName(response.senderId)}</span>
                    <span className="message-time">{formatTimestamp(response.timestamp)}</span>
                  </div>
                  <div className="message-content">
                    {response.content}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

MessageLog.displayName = 'MessageLog';

export default MessageLog;
