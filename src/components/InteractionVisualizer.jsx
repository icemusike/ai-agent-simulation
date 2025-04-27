import React, { useEffect, useRef, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import * as d3 from 'd3';
import './InteractionVisualizer.css';

const InteractionVisualizer = () => {
  const { agents, messages, getRelationship } = useSimulation();
  const [activeTab, setActiveTab] = useState('mindmap');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  
  const mindMapRef = useRef(null);
  const forceGraphRef = useRef(null);
  const interactionChartRef = useRef(null);
  const relationshipChartRef = useRef(null);
  const communicationNetworkRef = useRef(null);
  const sentimentAnalysisRef = useRef(null);
  
  // Get filtered messages based on time filter
  const getFilteredMessages = () => {
    if (timeFilter === 'all') {
      return messages;
    }
    
    const now = new Date();
    let timeThreshold;
    
    switch (timeFilter) {
      case 'recent':
        timeThreshold = new Date(now.getTime() - 1000 * 60 * 10); // Last 10 minutes
        break;
      case 'today':
        timeThreshold = new Date(now.setHours(0, 0, 0, 0)); // Start of today
        break;
      default:
        return messages;
    }
    
    return messages.filter(msg => new Date(msg.timestamp) >= timeThreshold);
  };
  
  // Get message sentiment stats
  const getSentimentStats = () => {
    const filteredMessages = getFilteredMessages();
    
    const sentimentCounts = {
      friendly: 0,
      neutral: 0,
      hostile: 0
    };
    
    filteredMessages.forEach(msg => {
      if (sentimentCounts[msg.type] !== undefined) {
        sentimentCounts[msg.type]++;
      }
    });
    
    return sentimentCounts;
  };
  
  // Create interaction matrix for heatmap
  const createInteractionMatrix = () => {
    const matrix = [];
    const filteredMessages = getFilteredMessages();
    
    // Skip if no agents
    if (agents.length === 0) return { matrix, agentNames: [] };
    
    // Initialize empty matrix with zeros
    const agentNames = agents.map(a => a.name);
    for (let i = 0; i < agents.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < agents.length; j++) {
        matrix[i][j] = 0;
      }
    }
    
    // Fill matrix with interaction counts
    filteredMessages.forEach(msg => {
      const senderIndex = agents.findIndex(a => a.id === msg.senderId);
      const receiverIndex = agents.findIndex(a => a.id === msg.receiverId);
      
      if (senderIndex >= 0 && receiverIndex >= 0) {
        matrix[senderIndex][receiverIndex]++;
      }
    });
    
    return { matrix, agentNames };
  };
  
  // Render mindmap visualization
  useEffect(() => {
    if (!mindMapRef.current || agents.length < 2 || activeTab !== 'mindmap') return;
    
    // Clear previous visualization
    d3.select(mindMapRef.current).selectAll('*').remove();
    
    const width = mindMapRef.current.clientWidth;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2;
    const nodeRadius = 35;  // Increased node size
    
    // Create SVG
    const svg = d3.select(mindMapRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });
    
    d3.select(mindMapRef.current).select('svg')
      .call(zoom)
      .on('dblclick.zoom', null);  // Disable double-click zoom
    
    // Create tooltip
    const tooltip = d3.select(mindMapRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    
    // Filter the agents based on selection
    const filteredAgents = selectedAgent
      ? [agents.find(a => a.id === selectedAgent), ...agents.filter(a => a.id !== selectedAgent)]
      : agents;
    
    // Create data structure for the visualization
    const nodes = filteredAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      type: getAgentType(agent),
      traits: agent.traits,
      radius: selectedAgent === agent.id ? nodeRadius * 1.2 : nodeRadius,
      selected: selectedAgent === agent.id
    }));
    
    const links = [];
    
    // Create links between agents based on their relationships
    for (let i = 0; i < filteredAgents.length; i++) {
      for (let j = i + 1; j < filteredAgents.length; j++) {
        const agent1 = filteredAgents[i];
        const agent2 = filteredAgents[j];
        const relationship = getRelationship(agent1.id, agent2.id);
        
        if (relationship !== 0 || selectedAgent === agent1.id || selectedAgent === agent2.id) {
          links.push({
            source: agent1.id,
            target: agent2.id,
            value: relationship,
            type: getRelationshipType(relationship),
            selected: selectedAgent && (selectedAgent === agent1.id || selectedAgent === agent2.id)
          });
        }
      }
    }
    
    // Count interactions between agents
    const interactionCounts = {};
    filteredAgents.forEach(agent => {
      interactionCounts[agent.id] = {};
      filteredAgents.forEach(other => {
        if (agent.id !== other.id) {
          interactionCounts[agent.id][other.id] = 0;
        }
      });
    });
    
    getFilteredMessages().forEach(msg => {
      if (interactionCounts[msg.senderId] && interactionCounts[msg.senderId][msg.receiverId] !== undefined) {
        interactionCounts[msg.senderId][msg.receiverId]++;
      }
    });
    
    // Create force simulation with improved forces
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id)
        .distance(d => selectedAgent && d.selected ? 150 : 200))
      .force('charge', d3.forceManyBody()
        .strength(d => selectedAgent && d.selected ? -500 : -300))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => d.radius + 15));
    
    // Create arrow markers for directed relationships
    svg.append('defs').selectAll('marker')
      .data(['positive', 'negative'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', d => d === 'positive' ? '#4caf50' : '#f44336')
      .attr('d', 'M0,-5L10,0L0,5');
    
    // Draw links with better styling
    const link = svg.append('g')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('stroke-width', d => Math.abs(d.value) / 20 + 2)
      .attr('stroke', d => getRelationshipColor(d.value))
      .attr('stroke-dasharray', d => d.value < 0 ? '5,5' : null)
      .attr('opacity', d => selectedAgent && !d.selected ? 0.3 : 0.8)
      .attr('marker-end', d => d.value >= 0 ? 'url(#arrow-positive)' : 'url(#arrow-negative)')
      .on('mouseover', function(event, d) {
        // Highlight on hover
        d3.select(this).attr('stroke-width', Math.abs(d.value) / 20 + 4);
        
        // Show tooltip with relationship details
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        
        const sourceNode = nodes.find(n => n.id === d.source.id || n.id === d.source);
        const targetNode = nodes.find(n => n.id === d.target.id || n.id === d.target);
        
        tooltip.html(`
          <strong>${sourceNode.name} → ${targetNode.name}</strong><br>
          Relationship: ${d.value} (${getRelationshipDescription(d.value)})<br>
          Interactions: ${interactionCounts[sourceNode.id][targetNode.id] + interactionCounts[targetNode.id][sourceNode.id]}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        // Reset on mouseout
        d3.select(this).attr('stroke-width', d => Math.abs(d.value) / 20 + 2);
        
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
    
    // Create node groups with improved styling
    const node = svg.append('g')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('mouseover', function(event, d) {
        // Show tooltip with agent details
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        
        tooltip.html(`
          <strong>${d.name}</strong><br>
          Role: ${d.role}<br>
          Type: ${d.type.charAt(0).toUpperCase() + d.type.slice(1)}<br>
          <br>
          <strong>Traits:</strong><br>
          Friendliness: ${d.traits.friendliness.toFixed(2)}<br>
          Aggression: ${d.traits.aggression.toFixed(2)}<br>
          Curiosity: ${d.traits.curiosity.toFixed(2)}<br>
          Extraversion: ${d.traits.extraversion.toFixed(2)}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
        
        // Highlight connected links and nodes
        link.attr('opacity', l => 
          l.source.id === d.id || l.target.id === d.id ? 1 : 0.2
        );
        
        node.attr('opacity', n => 
          n.id === d.id || links.some(l => 
            (l.source.id === d.id && l.target.id === n.id) || 
            (l.target.id === d.id && l.source.id === n.id)
          ) ? 1 : 0.4
        );
      })
      .on('mouseout', function() {
        // Reset on mouseout
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
        
        link.attr('opacity', d => selectedAgent && !d.selected ? 0.3 : 0.8);
        node.attr('opacity', 1);
      })
      .on('click', function(event, d) {
        // Toggle agent selection
        setSelectedAgent(selectedAgent === d.id ? null : d.id);
      });
    
    // Add fancy gradient-filled circles for nodes
    const nodeCircle = node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => getAgentColor(d.type))
      .attr('stroke', d => d.selected ? '#fff' : 'rgba(255, 255, 255, 0.5)')
      .attr('stroke-width', d => d.selected ? 3 : 1.5);
    
    // Add subtle glow effect for selected nodes
    node.filter(d => d.selected)
      .append('circle')
      .attr('r', d => d.radius + 8)
      .attr('fill', 'none')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5)
      .attr('stroke-dasharray', '3,3');
    
    // Add name labels
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none');
    
    // Add role labels below the name
    node.append('text')
      .text(d => d.role)
      .attr('text-anchor', 'middle')
      .attr('dy', 20)
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .style('font-size', '10px')
      .style('pointer-events', 'none');
    
    // Add labels for relationship values
    const linkLabels = svg.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('dy', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', d => getRelationshipColor(d.value))
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 3px rgba(0, 0, 0, 0.7)')
      .text(d => d.value);
    
    // Update positions on each tick
    simulation.on('tick', () => {
      // Calculate path for curved links
      link.attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });
      
      // Update node positions
      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
      
      // Update link label positions
      linkLabels.attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);
    });
    
    // Helper function to get relationship description
    function getRelationshipDescription(value) {
      if (value > 75) return "Very Close Friends";
      if (value > 50) return "Friends";
      if (value > 25) return "Friendly";
      if (value > -25) return "Neutral";
      if (value > -50) return "Dislike";
      if (value > -75) return "Enemies";
      return "Bitter Enemies";
    }
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [agents, getFilteredMessages(), activeTab, selectedAgent, getRelationship]);
  
  // Create interaction frequency chart
  useEffect(() => {
    if (!interactionChartRef.current || agents.length < 2 || activeTab !== 'interactions') return;
    
    // Clear previous visualization
    d3.select(interactionChartRef.current).selectAll('*').remove();
    
    const width = interactionChartRef.current.clientWidth;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Count interactions between agents
    const interactionCounts = {};
    
    agents.forEach(agent => {
      interactionCounts[agent.id] = {};
      agents.forEach(otherAgent => {
        if (agent.id !== otherAgent.id) {
          interactionCounts[agent.id][otherAgent.id] = 0;
        }
      });
    });
    
    getFilteredMessages().forEach(message => {
      if (interactionCounts[message.senderId] && interactionCounts[message.senderId][message.receiverId] !== undefined) {
        interactionCounts[message.senderId][message.receiverId]++;
      }
    });
    
    // Convert to array format for visualization
    const data = [];
    
    agents.forEach(agent => {
      agents.forEach(otherAgent => {
        if (agent.id !== otherAgent.id) {
          data.push({
            source: agent.name,
            target: otherAgent.name,
            count: interactionCounts[agent.id][otherAgent.id]
          });
        }
      });
    });
    
    // Sort by count
    data.sort((a, b) => b.count - a.count);
    
    // Take top 15 interactions
    const topData = data.slice(0, 15);
    
    // Create SVG
    const svg = d3.select(interactionChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create scales
    const x = d3.scaleBand()
      .domain(topData.map(d => `${d.source} → ${d.target}`))
      .range([0, innerWidth])
      .padding(0.2);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(topData, d => d.count) * 1.1 || 1]) // Ensure a valid domain even if all counts are 0
      .range([innerHeight, 0]);
    
    // Draw bars
    g.selectAll('.bar')
      .data(topData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(`${d.source} → ${d.target}`))
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.count))
      .attr('fill', '#6366f1');
    
    // Add value labels
    g.selectAll('.label')
      .data(topData)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => x(`${d.source} → ${d.target}`) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 5)
      .attr('text-anchor', 'middle')
      .text(d => d.count)
      .attr('fill', '#fff')
      .style('font-size', '12px');
    
    // Add axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);
    
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .style('font-size', '10px');
    
    g.append('g')
      .call(yAxis);
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Top Agent Interactions');
    
    // Add axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Agent Pairs');
    
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Interaction Count');
    
  }, [agents, getFilteredMessages(), activeTab]);
  
  // Render relationship strength chart
  useEffect(() => {
    if (!relationshipChartRef.current || activeTab !== 'relationships' || agents.length < 2) return;
    
    // Clear previous visualization
    d3.select(relationshipChartRef.current).selectAll('*').remove();
    
    const width = relationshipChartRef.current.clientWidth;
    const height = 450;
    const margin = { top: 50, right: 80, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(relationshipChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select(relationshipChartRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    
    // Get relationship data
    const relationshipData = [];
    
    agents.forEach(agent1 => {
      agents.forEach(agent2 => {
        if (agent1.id !== agent2.id) {
          // Skip if filtering by agent and neither agent matches
          if (selectedAgent && agent1.id !== selectedAgent && agent2.id !== selectedAgent) {
            return;
          }
          
          const relationship = getRelationship(agent1.id, agent2.id);
          relationshipData.push({
            source: agent1.name,
            target: agent2.name,
            sourceId: agent1.id,
            targetId: agent2.id,
            value: relationship,
            // Count messages between these agents
            messageCount: getFilteredMessages().filter(m => 
              (m.senderId === agent1.id && m.receiverId === agent2.id) ||
              (m.senderId === agent2.id && m.receiverId === agent1.id)
            ).length
          });
        }
      });
    });
    
    // Sort by absolute value
    relationshipData.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    
    // Take top 15 relationships (or fewer if there aren't 15)
    const topData = relationshipData.slice(0, 15);
    
    // If no relationships, show message
    if (topData.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', 'var(--text-muted)')
        .text('No relationships data available.');
      return;
    }
    
    // Create scales
    const x = d3.scaleBand()
      .domain(topData.map(d => `${d.source} & ${d.target}`))
      .range([0, innerWidth])
      .padding(0.2);
    
    // Ensure y domain has valid values
    const minValue = d3.min(topData, d => d.value) || -10;
    const maxValue = d3.max(topData, d => d.value) || 10;
    
    const y = d3.scaleLinear()
      .domain([
        minValue < 0 ? minValue * 1.1 : -10,
        maxValue * 1.1
      ])
      .range([innerHeight, 0]);
    
    // Add zero line with animation
    const zeroLine = g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4')
      .attr('opacity', 0);
    
    zeroLine.transition()
      .duration(800)
      .attr('opacity', 1);
    
    // Add "positive" and "negative" labels
    g.append('text')
      .attr('x', innerWidth - 10)
      .attr('y', y(maxValue / 2))
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', '#4caf50')
      .style('font-weight', 'bold')
      .text('POSITIVE');
    
    g.append('text')
      .attr('x', innerWidth - 10)
      .attr('y', y(minValue / 2))
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', '#f44336')
      .style('font-weight', 'bold')
      .text('NEGATIVE');
    
    // Draw background grid
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1);
    
    // Draw bars with animation
    const bars = g.selectAll('.bar')
      .data(topData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(`${d.source} & ${d.target}`))
      .attr('width', x.bandwidth())
      .attr('y', y(0))  // Start at zero
      .attr('height', 0)  // Start with zero height
      .attr('fill', d => getRelationshipColor(d.value))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('rx', 2)  // Rounded corners
      .attr('ry', 2);
    
    // Animate the bars
    bars.transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .attr('y', d => d.value >= 0 ? y(d.value) : y(0))
      .attr('height', d => Math.abs(y(d.value) - y(0)));
    
    // Add interaction to bars
    bars.on('mouseover', function(event, d) {
      // Highlight on hover
      d3.select(this)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('opacity', 0.9);
      
      // Show tooltip
      tooltip.transition()
        .duration(200)
        .style('opacity', 0.9);
      
      // Get agent relationship type
      const relationshipType = 
        d.value > 75 ? "Very Close Friends" :
        d.value > 50 ? "Friends" :
        d.value > 25 ? "Friendly" :
        d.value > -25 ? "Neutral" :
        d.value > -50 ? "Dislike" :
        d.value > -75 ? "Enemies" :
        "Bitter Enemies";
      
      tooltip.html(`
        <strong>${d.source} & ${d.target}</strong><br>
        Relationship: ${d.value} (${relationshipType})<br>
        Message Exchanges: ${d.messageCount}
      `)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      // Reset on mouseout
      d3.select(this)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('opacity', 1);
      
      tooltip.transition()
        .duration(500)
        .style('opacity', 0);
    })
    .on('click', function(event, d) {
      // Set both agents as selected to focus on their relationship
      if (selectedAgent === d.sourceId || selectedAgent === d.targetId) {
        setSelectedAgent(null);
      } else {
        setSelectedAgent(d.sourceId);
      }
    });
    
    // Add value labels with animation
    const labels = g.selectAll('.label')
      .data(topData)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => x(`${d.source} & ${d.target}`) + x.bandwidth() / 2)
      .attr('y', y(0))  // Start at zero position
      .attr('text-anchor', 'middle')
      .text(d => d.value)
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('opacity', 0);  // Start invisible
    
    // Animate the labels
    labels.transition()
      .duration(800)
      .delay((d, i) => i * 50 + 300)  // Delay labels to appear after bars
      .attr('y', d => d.value >= 0 ? y(d.value) - 12 : y(d.value) + 16)
      .style('opacity', 1);
    
    // Add axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);
    
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .style('font-size', '10px');
    
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);
    
    // Style the axes
    g.selectAll('.x-axis path, .y-axis path, .x-axis line, .y-axis line')
      .attr('stroke', 'var(--border-color)');
    
    g.selectAll('.x-axis text, .y-axis text')
      .attr('fill', 'var(--text-secondary)');
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-primary)')
      .text('Agent Relationship Strengths');
    
    // Add axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text('Agent Pairs');
    
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text('Relationship Value');
    
  }, [agents, getFilteredMessages(), activeTab, selectedAgent, getRelationship]);
  
  // Render force-directed graph visualization
  useEffect(() => {
    if (!forceGraphRef.current || activeTab !== 'forcegraph' || agents.length < 2) return;
    
    // Clear previous visualization
    d3.select(forceGraphRef.current).selectAll('*').remove();
    
    const width = forceGraphRef.current.clientWidth;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create SVG
    const svg = d3.select(forceGraphRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);
    
    // Create tooltip
    const tooltip = d3.select(forceGraphRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    
    // Filter messages
    const filteredMessages = getFilteredMessages();
    
    // If filtered messages are empty but agents exist, just show agents without connections
    if (filteredMessages.length === 0 && agents.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', 'var(--text-muted)')
        .text('No agents or messages available.');
      return;
    }
    
    // Create node data
    const nodes = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      type: getAgentType(agent),
      traits: agent.traits,
      messageCount: filteredMessages.filter(m => m.senderId === agent.id || m.receiverId === agent.id).length,
      radius: 25 // Base radius
    }));
    
    // Calculate message exchanges between agents
    const linkMap = new Map();
    
    filteredMessages.forEach(message => {
      const key = [message.senderId, message.receiverId].sort().join('-');
      if (!linkMap.has(key)) {
        linkMap.set(key, {
          source: message.senderId,
          target: message.receiverId,
          count: 1,
          messages: [message]
        });
      } else {
        const link = linkMap.get(key);
        link.count++;
        link.messages.push(message);
      }
    });
    
    const links = Array.from(linkMap.values());
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => d.radius + 10));
    
    // Create curved path generator for links
    const linkPath = (d) => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
      return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    };
    
    // Determine max link value for scaling
    const maxLinkValue = d3.max(links, d => d.count) || 1;
    
    // Create links
    const link = g.append('g')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', d => 1 + (d.count / maxLinkValue * 6))
      .attr('fill', 'none')
      .attr('opacity', d => {
        if (selectedAgent) {
          return d.source.id === selectedAgent || d.target.id === selectedAgent ? 1 : 0.2;
        }
        return 0.7;
      })
      .on('mouseover', function(event, d) {
        // Highlight on hover
        d3.select(this)
          .attr('stroke-width', d => 2 + (d.count / maxLinkValue * 8))
          .attr('opacity', 1);
        
        // Show tooltip
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        
        // Get agent names for display
        const sourceAgent = agents.find(a => a.id === d.source.id || a.id === d.source);
        const targetAgent = agents.find(a => a.id === d.target.id || a.id === d.target);
        
        // Calculate message types
        const friendlyCount = d.messages?.filter(m => m.type === 'friendly').length || 0;
        const neutralCount = d.messages?.filter(m => m.type === 'neutral').length || 0;
        const hostileCount = d.messages?.filter(m => m.type === 'hostile').length || 0;
        
        tooltip.html(`
          <strong>${sourceAgent?.name} ↔ ${targetAgent?.name}</strong><br>
          Total messages: ${d.count}<br>
          <span style="color: #4caf50">Friendly: ${friendlyCount}</span><br>
          <span style="color: #9e9e9e">Neutral: ${neutralCount}</span><br>
          <span style="color: #f44336">Hostile: ${hostileCount}</span>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
        
        // Highlight connected nodes
        node.attr('opacity', n => 
          n.id === d.source.id || n.id === d.target.id ? 1 : 0.3
        );
      })
      .on('mouseout', function(event, d) {
        // Reset on mouseout
        d3.select(this)
          .attr('stroke-width', d => 1 + (d.count / maxLinkValue * 6))
          .attr('opacity', selectedAgent ? 
            (d.source.id === selectedAgent || d.target.id === selectedAgent ? 1 : 0.2) : 
            0.7);
        
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
        
        // Reset node opacity
        node.attr('opacity', n => 
          selectedAgent ? (n.id === selectedAgent ? 1 : 0.7) : 1
        );
      });
    
    // Calculate the largest message count for node scaling
    const maxMessageCount = d3.max(nodes, d => d.messageCount) || 1;
    
    // Create node groups
    const node = g.append('g')
      .selectAll('.node-group')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('opacity', d => selectedAgent ? (d.id === selectedAgent ? 1 : 0.7) : 1)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('mouseover', function(event, d) {
        // Highlight on hover
        d3.select(this).attr('opacity', 1);
        
        // Highlight connected links
        link.attr('opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.2
        );
        
        // Show tooltip
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        
        // Calculate message stats
        const sentMessages = filteredMessages.filter(m => m.senderId === d.id);
        const receivedMessages = filteredMessages.filter(m => m.receiverId === d.id);
        
        tooltip.html(`
          <strong>${d.name}</strong> (${d.role})<br>
          Messages sent: ${sentMessages.length}<br>
          Messages received: ${receivedMessages.length}<br>
          <span style="color: #4caf50">Friendly: ${sentMessages.filter(m => m.type === 'friendly').length}</span><br>
          <span style="color: #9e9e9e">Neutral: ${sentMessages.filter(m => m.type === 'neutral').length}</span><br>
          <span style="color: #f44336">Hostile: ${sentMessages.filter(m => m.type === 'hostile').length}</span>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        // Reset opacity
        d3.select(this).attr('opacity', d => 
          selectedAgent ? (d.id === selectedAgent ? 1 : 0.7) : 1
        );
        
        // Reset link opacity
        link.attr('opacity', d => {
          if (selectedAgent) {
            return d.source.id === selectedAgent || d.target.id === selectedAgent ? 1 : 0.2;
          }
          return 0.7;
        });
        
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      })
      .on('click', function(event, d) {
        // Toggle agent selection
        setSelectedAgent(selectedAgent === d.id ? null : d.id);
      });
    
    // Calculate node radius based on message count
    nodes.forEach(node => {
      node.radius = 25 + (node.messageCount / maxMessageCount * 15);
    });
    
    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => getAgentColor(d.type))
      .attr('stroke', d => d.id === selectedAgent ? '#fff' : 'rgba(255, 255, 255, 0.5)')
      .attr('stroke-width', d => d.id === selectedAgent ? 3 : 1.5);
    
    // Add node icons based on type
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .style('font-size', '16px')
      .style('fill', '#fff')
      .text(d => {
        switch(d.type) {
          case 'friendly': return '😊';
          case 'aggressive': return '😠';
          case 'cold': return '😐';
          default: return '🙂';
        }
      });
    
    // Add name labels
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 15)
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
    
    // Add role labels
    node.append('text')
      .text(d => d.role)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 30)
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .style('font-size', '10px')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
    
    // Add message count labels
    node.append('text')
      .text(d => d.messageCount)
      .attr('class', 'message-count')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none');
    
    // Add label on links showing message count
    g.append('g')
      .selectAll('.link-label')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .text(d => d.count)
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('fill', '#fff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
    
    // Update positions on each tick
    simulation.on('tick', () => {
      link.attr('d', linkPath);
      
      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
      
      // Update link labels
      g.selectAll('.link-label')
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
    });
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-primary)')
      .text('Agent Communication Network');
    
    // Add instructions
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-muted)')
      .text('Drag agents to rearrange. Click on an agent to focus. Scroll to zoom.');
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
  }, [agents, getFilteredMessages(), activeTab, selectedAgent]);

  // Render interaction heatmap
  useEffect(() => {
    if (!interactionChartRef.current || activeTab !== 'heatmap' || agents.length < 2) return;
    
    // Clear previous visualization
    d3.select(interactionChartRef.current).selectAll('*').remove();

    const width = interactionChartRef.current.clientWidth;
    const height = 450;
    const margin = { top: 60, right: 60, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(interactionChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select(interactionChartRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    
    // Create interaction matrix
    const { matrix, agentNames } = createInteractionMatrix();
    
    // Skip if no interactions or agents
    if (agentNames.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', 'var(--text-muted)')
        .text('No interactions recorded yet.');
      return;
    }
    
    // Calculate maximum interaction count
    const maxInteractions = d3.max(matrix.flat()) || 1;
    
    // Create scales
    const x = d3.scaleBand()
      .domain(agentNames)
      .range([0, innerWidth])
      .padding(0.05);
    
    const y = d3.scaleBand()
      .domain(agentNames)
      .range([0, innerHeight])
      .padding(0.05);
    
    // Color scale for heatmap cells
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, maxInteractions]);
    
    // Create heatmap cells
    const cells = g.selectAll('.heatmap-cell')
      .data(matrix.flatMap((row, i) => 
        row.map((value, j) => ({
          value,
          source: agentNames[i],
          target: agentNames[j],
          sourceIndex: i,
          targetIndex: j
        }))
      ))
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => x(d.source))
      .attr('y', d => y(d.target))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => d.sourceIndex === d.targetIndex ? 'transparent' : colorScale(d.value))
      .attr('opacity', d => {
        // If selected agent is set, highlight only that agent's interactions
        if (selectedAgent) {
          const selectedAgentName = agents.find(a => a.id === selectedAgent)?.name;
          return d.source === selectedAgentName || d.target === selectedAgentName ? 1 : 0.3;
        }
        return 1;
      })
      .on('mouseover', function(event, d) {
        // Skip diagonal cells (self-interactions)
        if (d.sourceIndex === d.targetIndex) return;
        
        // Highlight on hover
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        
        // Show tooltip with interaction details
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        
        tooltip.html(`
          <strong>${d.source} → ${d.target}</strong><br>
          Interactions: ${d.value}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
        
        // Highlight row and column
        g.selectAll('.heatmap-cell')
          .filter(c => c.source === d.source || c.target === d.target)
          .attr('opacity', 1);
      })
      .on('mouseout', function(event, d) {
        // Skip diagonal cells
        if (d.sourceIndex === d.targetIndex) return;
        
        // Reset on mouseout
        d3.select(this)
          .attr('stroke', 'var(--bg-card)')
          .attr('stroke-width', 1);
        
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
        
        // Reset opacity
        g.selectAll('.heatmap-cell')
          .attr('opacity', selectedAgent ? (c => {
            const selectedAgentName = agents.find(a => a.id === selectedAgent)?.name;
            return c.source === selectedAgentName || c.target === selectedAgentName ? 1 : 0.3;
          }) : 1);
      });
    
    // Add axis labels
    const xAxis = g.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x));
    
    xAxis.selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .style('font-size', '10px');
    
    const yAxis = g.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(y));
    
    // Add titles
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-primary)')
      .text('Agent Interaction Heatmap');
    
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 60)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text('Message Senders');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text('Message Recipients');
    
    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendX = d3.scaleLinear()
      .domain([0, maxInteractions])
      .range([0, legendWidth]);
    
    const legendXAxis = d3.axisBottom(legendX)
      .ticks(5)
      .tickFormat(d => Math.round(d));
    
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right - legendWidth}, ${margin.top / 2})`);
    
    // Create gradient for legend
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    // Add gradient stops based on color scale
    const stops = [0, 0.2, 0.4, 0.6, 0.8, 1];
    stops.forEach(stop => {
      gradient.append('stop')
        .attr('offset', `${stop * 100}%`)
        .attr('stop-color', colorScale(stop * maxInteractions));
    });
    
    // Draw legend rectangle with gradient
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');
    
    // Add legend axis
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendXAxis);
    
    // Add legend title
    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', 'var(--text-secondary)')
      .text('Interaction Count');
    
  }, [agents, getFilteredMessages(), activeTab, selectedAgent, createInteractionMatrix]);

  // Render sentiment analysis visualization
  useEffect(() => {
    if (!sentimentAnalysisRef.current || activeTab !== 'sentiment' || messages.length === 0) return;
    
    // Clear previous visualization
    d3.select(sentimentAnalysisRef.current).selectAll('*').remove();
    
    const width = sentimentAnalysisRef.current.clientWidth;
    const height = 450;
    const margin = { top: 50, right: 70, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(sentimentAnalysisRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select(sentimentAnalysisRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    
    // Filter messages
    const filteredMessages = getFilteredMessages();
    
    // If filtered messages are empty, show message
    if (filteredMessages.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', 'var(--text-muted)')
        .text('No messages in the selected time period.');
      return;
    }
    
    // Process data for visualization
    // Group messages by time intervals
    const timeExtent = d3.extent(filteredMessages, d => new Date(d.timestamp));
    const timeRangeMs = timeExtent[1] - timeExtent[0];
    
    // Determine bin interval based on data range
    let binInterval;
    if (timeRangeMs > 1000 * 60 * 60 * 24) {  // More than a day
      binInterval = 1000 * 60 * 60 * 4;  // 4-hour bins
    } else if (timeRangeMs > 1000 * 60 * 60) {  // More than an hour
      binInterval = 1000 * 60 * 10;  // 10-minute bins
    } else {
      binInterval = 1000 * 60;  // 1-minute bins
    }
    
    // Create time bins
    const bins = [];
    for (let time = timeExtent[0].getTime(); time <= timeExtent[1].getTime(); time += binInterval) {
      bins.push(new Date(time));
    }
    
    // Group messages by sentiment and bin
    const sentimentTypes = ['friendly', 'neutral', 'hostile'];
    const sentimentData = sentimentTypes.map(type => {
      const typeBins = bins.map(bin => {
        // Get the next bin boundary
        const nextBin = new Date(bin.getTime() + binInterval);
        
        // Count messages of this type in this bin
        const count = filteredMessages.filter(msg => 
          msg.type === type && 
          new Date(msg.timestamp) >= bin && 
          new Date(msg.timestamp) < nextBin
        ).length;
        
        return {
          time: bin,
          count,
          type
        };
      });
      
      return {
        type,
        values: typeBins
      };
    });
    
    // Create scales
    const x = d3.scaleTime()
      .domain(timeExtent)
      .range([0, innerWidth]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(sentimentData.flatMap(d => d.values), d => d.count) * 1.1 || 10])
      .range([innerHeight, 0]);
    
    // Create line generators
    const line = d3.line()
      .x(d => x(d.time))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);
    
    const area = d3.area()
      .x(d => x(d.time))
      .y0(innerHeight)
      .y1(d => y(d.count))
      .curve(d3.curveMonotoneX);
    
    // Add areas
    g.selectAll('.sentiment-area')
      .data(sentimentData)
      .enter()
      .append('path')
      .attr('class', 'sentiment-area')
      .attr('fill', d => getSentimentColor(d.type))
      .attr('d', d => area(d.values));
    
    // Add lines
    g.selectAll('.sentiment-line')
      .data(sentimentData)
      .enter()
      .append('path')
      .attr('class', 'sentiment-line')
      .attr('stroke', d => getSentimentColor(d.type))
      .attr('d', d => line(d.values));
    
    // Add data points with tooltips
    sentimentData.forEach(sentimentGroup => {
      g.selectAll(`.point-${sentimentGroup.type}`)
        .data(sentimentGroup.values.filter(d => d.count > 0))  // Only show points with data
        .enter()
        .append('circle')
        .attr('class', `point-${sentimentGroup.type}`)
        .attr('cx', d => x(d.time))
        .attr('cy', d => y(d.count))
        .attr('r', 5)
        .attr('fill', getSentimentColor(sentimentGroup.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .on('mouseover', function(event, d) {
          // Highlight on hover
          d3.select(this)
            .attr('r', 7)
            .attr('stroke-width', 2);
          
          // Show tooltip
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          
          const timeFormat = timeRangeMs > 1000 * 60 * 60 * 24
            ? d3.timeFormat('%b %d, %H:%M')
            : d3.timeFormat('%H:%M:%S');
          
          tooltip.html(`
            <strong>${d.type.charAt(0).toUpperCase() + d.type.slice(1)} Messages</strong><br>
            Time: ${timeFormat(d.time)}<br>
            Count: ${d.count}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          // Reset on mouseout
          d3.select(this)
            .attr('r', 5)
            .attr('stroke-width', 1.5);
          
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        });
    });
    
    // Add axes
    const xAxis = d3.axisBottom(x)
      .ticks(timeRangeMs > 1000 * 60 * 60 * 24 ? 10 : 5)
      .tickFormat(timeRangeMs > 1000 * 60 * 60 * 24
        ? d3.timeFormat('%b %d, %H:%M')
        : d3.timeFormat('%H:%M:%S'));
    
    const yAxis = d3.axisLeft(y);
    
    g.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');
    
    g.append('g')
      .attr('class', 'axis')
      .call(yAxis);
    
    // Add axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 50)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text('Time');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text('Message Count');
    
    // Add title
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-primary)')
      .text('Message Sentiment Over Time');
    
    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right}, ${margin.top})`);
    
    sentimentTypes.forEach((type, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);
      
      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', getSentimentColor(type));
      
      legendRow.append('text')
        .attr('x', -10)
        .attr('y', 12.5)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', 'var(--text-secondary)')
        .text(type.charAt(0).toUpperCase() + type.slice(1));
    });
    
  }, [messages, getFilteredMessages, activeTab, timeFilter]);
  
  // Helper functions
  const getAgentType = (agent) => {
    const friendliness = agent.traits.friendliness || 0.5;
    const aggression = agent.traits.aggression || 0.5;
    
    if (friendliness > 0.7 && aggression < 0.3) {
      return 'friendly';
    } else if (aggression > 0.7) {
      return 'aggressive';
    } else if (friendliness < 0.3) {
      return 'cold';
    } else {
      return 'neutral';
    }
  };
  
  const getAgentColor = (type) => {
    switch (type) {
      case 'friendly':
        return '#4caf50';
      case 'aggressive':
        return '#f44336';
      case 'cold':
        return '#78909c';
      default:
        return '#9575cd';
    }
  };
  
  const getRelationshipType = (value) => {
    if (value > 50) return 'strong-positive';
    if (value > 0) return 'positive';
    if (value > -50) return 'negative';
    return 'strong-negative';
  };
  
  const getRelationshipColor = (value) => {
    if (value > 75) return '#2e7d32'; // Very positive
    if (value > 50) return '#4caf50'; // Positive
    if (value > 25) return '#8bc34a'; // Somewhat positive
    if (value > -25) return '#9e9e9e'; // Neutral
    if (value > -50) return '#ff9800'; // Somewhat negative
    if (value > -75) return '#f44336'; // Negative
    return '#c62828'; // Very negative
  };
  
  const getSentimentColor = (type) => {
    switch (type) {
      case 'friendly':
        return '#4caf50';
      case 'hostile':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };
  
  return (
    <div className="visualizer-container">
      <h2>Agent Interaction Analysis</h2>
      
      <div className="visualizer-controls">
        <div className="time-filter">
          <label>Time Range:</label>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="recent">Recent (10 min)</option>
            <option value="today">Today</option>
          </select>
        </div>
        
        {agents.length > 0 && (
          <div className="agent-filter">
            <label>Focus Agent:</label>
            <select 
              value={selectedAgent || ''} 
              onChange={(e) => setSelectedAgent(e.target.value || null)}
            >
              <option value="">All Agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="visualizer-tabs">
        <button 
          className={activeTab === 'mindmap' ? 'active' : ''} 
          onClick={() => setActiveTab('mindmap')}
        >
          Relationship Mind Map
        </button>
        <button 
          className={activeTab === 'forcegraph' ? 'active' : ''} 
          onClick={() => setActiveTab('forcegraph')}
        >
          Force Graph
        </button>
        <button 
          className={activeTab === 'heatmap' ? 'active' : ''} 
          onClick={() => setActiveTab('heatmap')}
        >
          Interaction Heatmap
        </button>
        <button 
          className={activeTab === 'relationships' ? 'active' : ''} 
          onClick={() => setActiveTab('relationships')}
        >
          Relationship Strengths
        </button>
        <button 
          className={activeTab === 'sentiment' ? 'active' : ''} 
          onClick={() => setActiveTab('sentiment')}
        >
          Sentiment Analysis
        </button>
      </div>
      
      <div className="stats-overview">
        <div className="stat-card">
          <h4>Total Interactions</h4>
          <div className="stat-value">{getFilteredMessages().length}</div>
        </div>
        <div className="stat-card">
          <h4>Active Agents</h4>
          <div className="stat-value">{agents.length}</div>
        </div>
        <div className="stat-card">
          <h4>Sentiment Distribution</h4>
          <div className="sentiment-distribution">
            {Object.entries(getSentimentStats()).map(([type, count]) => (
              <div 
                key={type} 
                className="sentiment-bar" 
                style={{ 
                  backgroundColor: getSentimentColor(type),
                  width: `${count / getFilteredMessages().length * 100 || 0}%` 
                }}
                title={`${type}: ${count} messages`}
              ></div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="visualizer-content">
        {activeTab === 'mindmap' && (
          <div className="mind-map-container">
            {agents.length < 2 ? (
              <div className="empty-visualization">
                <p>Add at least two agents and let them interact to see the relationship mind map.</p>
              </div>
            ) : (
              <div className="mind-map" ref={mindMapRef}></div>
            )}
            <div className="legend">
              <h4>Legend</h4>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#4caf50' }}></div>
                <span>Friendly Agent</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#f44336' }}></div>
                <span>Aggressive Agent</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#78909c' }}></div>
                <span>Cold Agent</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#9575cd' }}></div>
                <span>Neutral Agent</span>
              </div>
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: '#2e7d32' }}></div>
                <span>Strong Positive Relationship</span>
              </div>
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: '#f44336' }}></div>
                <span>Strong Negative Relationship</span>
              </div>
              <div className="legend-item">
                <div className="legend-line dashed" style={{ backgroundColor: '#f44336' }}></div>
                <span>Negative Relationship</span>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'forcegraph' && (
          <div className="force-graph-container">
            {agents.length < 2 ? (
              <div className="empty-visualization">
                <p>Add at least two agents and let them interact to see the force-directed graph.</p>
              </div>
            ) : (
              <div className="force-graph" ref={forceGraphRef}></div>
            )}
          </div>
        )}
        
        {activeTab === 'heatmap' && (
          <div className="heatmap-container">
            {messages.length === 0 ? (
              <div className="empty-visualization">
                <p>Start the simulation and let agents interact to see the interaction heatmap.</p>
              </div>
            ) : (
              <div className="interaction-heatmap" ref={interactionChartRef}></div>
            )}
          </div>
        )}
        
        {activeTab === 'relationships' && (
          <div className="relationship-chart-container">
            {agents.length < 2 ? (
              <div className="empty-visualization">
                <p>Add at least two agents and let them interact to see the relationship strength chart.</p>
              </div>
            ) : (
              <div className="relationship-chart" ref={relationshipChartRef}></div>
            )}
          </div>
        )}
        
        {activeTab === 'sentiment' && (
          <div className="sentiment-analysis-container">
            {messages.length === 0 ? (
              <div className="empty-visualization">
                <p>Start the simulation and let agents interact to see the sentiment analysis.</p>
              </div>
            ) : (
              <div className="sentiment-analysis" ref={sentimentAnalysisRef}></div>
            )}
          </div>
        )}
      </div>
      
      <div className="visualization-info">
        <p>
          {activeTab === 'mindmap' && 'This mind map shows relationships between agents. Drag nodes to rearrange. Line thickness represents relationship strength.'}
          {activeTab === 'forcegraph' && 'This force-directed graph visualizes agent connections through a physics simulation. Nodes represent agents, and edges represent message exchanges.'}
          {activeTab === 'heatmap' && 'This heatmap shows the frequency of interactions between agents. Darker cells indicate more frequent communication.'}
          {activeTab === 'relationships' && 'This chart shows the strength of relationships between agent pairs, sorted by strongest relationships (positive or negative).'}
          {activeTab === 'sentiment' && 'This visualization shows the sentiment distribution of messages over time, allowing you to track emotional patterns.'}
        </p>
      </div>
    </div>
  );
};

export default InteractionVisualizer;
