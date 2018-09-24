/* globals mure */
import PersistentGraph from './PersistentGraph.js';

class NetworkModelGraph extends PersistentGraph {
  keyFunction (node) {
    return node.classId;
  }
  async deriveGraph () {
    const edgeClasses = [];
    const nodeLookup = {}; // maps a class selector to an index in graph.nodes
    let graph = {
      nodes: [],
      edges: []
    };

    Object.entries(mure.classes).forEach(([selector, classObj]) => {
      // Add and index the class as a node
      nodeLookup[classObj.classId] = graph.nodes.length;
      graph.nodes.push({ classObj });
      if (classObj.type === 'Edge') {
        // Store the edge class so we can create connections later
        edgeClasses.push(classObj);
      } else if (classObj.type === 'Node') {
        // Create a "potential" connection + dummy node
        graph.edges.push({
          id: `${classObj.classId}>dummy`,
          source: graph.nodes.length - 1,
          target: graph.nodes.length,
          directed: false,
          location: 'node',
          dummy: true
        });
        graph.nodes.push({ dummy: true });
      }
    });

    // Create existing connections
    edgeClasses.forEach(edgeClass => {
      if (edgeClass.sourceClassId !== null) {
        // Connect the source node to the edge
        graph.edges.push({
          id: `${edgeClass.sourceClassId}>${edgeClass.classId}`,
          source: nodeLookup[edgeClass.sourceClassId],
          target: nodeLookup[edgeClass.classId],
          directed: edgeClass.directed,
          location: 'source'
        });
      } else {
        // Create a "potential" connection + dummy source node
        graph.edges.push({
          id: `dummy>${edgeClass.classId}`,
          source: graph.nodes.length,
          target: nodeLookup[edgeClass.classId],
          directed: edgeClass.directed,
          location: 'source',
          dummy: true
        });
        graph.nodes.push({ dummy: true });
      }
      if (edgeClass.targetClassId !== null) {
        // Connect the edge to the target node
        graph.edges.push({
          id: `${edgeClass.classId}>${edgeClass.targetClassId}`,
          source: nodeLookup[edgeClass.classId],
          target: nodeLookup[edgeClass.targetClassId],
          directed: edgeClass.directed,
          location: 'target'
        });
      } else {
        // Create a "potential" connection + dummy target node
        graph.edges.push({
          id: `${edgeClass.classId}>dummy`,
          source: nodeLookup[edgeClass.classId],
          target: graph.nodes.length,
          directed: edgeClass.directed,
          location: 'target',
          dummy: true
        });
        graph.nodes.push({ dummy: true });
      }
    });

    return graph;
  }
}

export default NetworkModelGraph;
