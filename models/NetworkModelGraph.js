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

    // Create nodes + pseudo-nodes for edges, and build a lookup for them
    Object.entries(mure.classes).forEach(([selector, classObj]) => {
      nodeLookup[classObj.classId] = graph.nodes.length;
      graph.nodes.push(classObj);
      if (classObj.type === 'Edge') {
        edgeClasses.push(classObj);
      }
    });

    // Get any links that exist
    edgeClasses.forEach(edgeClass => {
      if (edgeClass.sourceClassId !== null) {
        graph.edges.push({
          id: `${edgeClass.sourceClassId}>${edgeClass.classId}`,
          source: nodeLookup[edgeClass.sourceClassId],
          target: nodeLookup[edgeClass.classId],
          directed: edgeClass.directed
        });
      }
      if (edgeClass.targetClassId !== null) {
        graph.edges.push({
          id: `${edgeClass.classId}>${edgeClass.targetClassId}`,
          source: nodeLookup[edgeClass.classId],
          target: nodeLookup[edgeClass.targetClassId],
          directed: edgeClass.directed
        });
      }
    });

    return graph;
  }
}

export default NetworkModelGraph;
