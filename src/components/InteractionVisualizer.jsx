import React, { useEffect, useRef, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import * as d3 from 'd3';
import './InteractionVisualizer.css';

const InteractionVisualizer = () => {
  const { agents, messages, getRelationship } = useSimulation();
  const [activeTab, setActiveTab] = useState('mindmap');
  const mindMapRef = useRef(null);
  const interactionChartRef = useRef(null);
  const relationshipChartRef = useRef(null);
  
  // Create a mind map visualization of agent relationships
  useEffect(() => {
    if (!mindMapRef.current || agents.length < 2 || activeTab !== 'mindmap') return;
    
    // Clear previous visualization
    d3.select(mindMapRef.current).selectAll('*').remove();
    
    const width = mindMapRef.current.clientWidth;
    const height = 400;
    
    // Create SVG
    const svg = d3.select(mindMapRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    // Create data structure for the visualization
    const nodes = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: getAgentType(agent),
      radius: 30
    }));
    
    const links = [];
    
    // Create links between agents based on their relationships
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const agent1 = agents[i];
        const agent2 = agents[j];
        const relationship = getRelationship(agent1.id, agent2.id);
        
        if (relationship !== 0) {
          links.push({
            source: agent1.id,
            target: agent2.id,
            value: relationship,
            type: getRelationshipType(relationship)
          });
        }
      }
    }
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => d.radius + 10));
    
    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', d => Math.abs(d.value) / 20 + 1)
      .attr('stroke', d => getRelationshipColor(d.value))
      .attr('stroke-dasharray', d => d.value < 0 ? '5,5' : null);
    
    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => getAgentColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    // Add text labels
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none');
    
    // Create a separate group for relationship labels
    const linkLabels = svg.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('dy', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', d => getRelationshipColor(d.value))
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => d.value);
    
    // Update positions on each tick
    simulation.on('tick', () => {
      // Update link positions
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      // Update node positions
      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
      
      // Update relationship label positions
      // Only update if source and target have defined positions
      linkLabels
        .attr('x', d => {
          // Check if source and target have valid positions
          if (d.source.x !== undefined && d.target.x !== undefined) {
            return (d.source.x + d.target.x) / 2;
          }
          return 0; // Default position if coordinates are undefined
        })
        .attr('y', d => {
          // Check if source and target have valid positions
          if (d.source.y !== undefined && d.target.y !== undefined) {
            return (d.source.y + d.target.y) / 2;
          }
          return 0; // Default position if coordinates are undefined
        });
    });
    
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
    
  }, [agents, messages, activeTab]);
  
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
    
    messages.forEach(message => {
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
    
  }, [agents, messages, activeTab]);
  
  // Create relationship strength chart
  useEffect(() => {
    if (!relationshipChartRef.current || agents.length < 2 || activeTab !== 'relationships') return;
    
    // Clear previous visualization
    d3.select(relationshipChartRef.current).selectAll('*').remove();
    
    const width = relationshipChartRef.current.clientWidth;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Get relationship data
    const relationshipData = [];
    
    agents.forEach(agent => {
      agents.forEach(otherAgent => {
        if (agent.id !== otherAgent.id) {
          const relationship = getRelationship(agent.id, otherAgent.id);
          relationshipData.push({
            source: agent.name,
            target: otherAgent.name,
            value: relationship
          });
        }
      });
    });
    
    // Sort by absolute value
    relationshipData.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    
    // Take top 15 relationships
    const topData = relationshipData.slice(0, 15);
    
    // Create SVG
    const svg = d3.select(relationshipChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
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
    
    // Draw bars
    g.selectAll('.bar')
      .data(topData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(`${d.source} & ${d.target}`))
      .attr('y', d => d.value >= 0 ? y(d.value) : y(0))
      .attr('width', x.bandwidth())
      .attr('height', d => Math.abs(y(d.value) - y(0)))
      .attr('fill', d => getRelationshipColor(d.value));
    
    // Add value labels
    g.selectAll('.label')
      .data(topData)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => x(`${d.source} & ${d.target}`) + x.bandwidth() / 2)
      .attr('y', d => d.value >= 0 ? y(d.value) - 5 : y(d.value) + 15)
      .attr('text-anchor', 'middle')
      .text(d => d.value)
      .attr('fill', '#fff')
      .style('font-size', '12px');
    
    // Add zero line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4');
    
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
      .text('Agent Relationship Strengths');
    
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
      .text('Relationship Value');
    
  }, [agents, messages, activeTab]);
  
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
  
  return (
    <div className="visualizer-container">
      <h2>Agent Interaction Analysis</h2>
      
      <div className="visualizer-tabs">
        <button 
          className={activeTab === 'mindmap' ? 'active' : ''} 
          onClick={() => setActiveTab('mindmap')}
        >
          Relationship Mind Map
        </button>
        <button 
          className={activeTab === 'interactions' ? 'active' : ''} 
          onClick={() => setActiveTab('interactions')}
        >
          Interaction Frequency
        </button>
        <button 
          className={activeTab === 'relationships' ? 'active' : ''} 
          onClick={() => setActiveTab('relationships')}
        >
          Relationship Strengths
        </button>
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
        
        {activeTab === 'interactions' && (
          <div className="interaction-chart-container">
            {messages.length === 0 ? (
              <div className="empty-visualization">
                <p>Start the simulation and let agents interact to see the interaction frequency chart.</p>
              </div>
            ) : (
              <div className="interaction-chart" ref={interactionChartRef}></div>
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
      </div>
      
      <div className="visualization-info">
        <p>
          {activeTab === 'mindmap' && 'This mind map shows relationships between agents. Drag nodes to rearrange. Line thickness represents relationship strength.'}
          {activeTab === 'interactions' && 'This chart shows the frequency of interactions between agent pairs, sorted by most frequent interactions.'}
          {activeTab === 'relationships' && 'This chart shows the strength of relationships between agent pairs, sorted by strongest relationships (positive or negative).'}
        </p>
      </div>
    </div>
  );
};

export default InteractionVisualizer;
