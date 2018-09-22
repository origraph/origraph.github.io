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

    // Create nodes for all classes, a lookup for them
    Object.entries(mure.classes).forEach(([selector, classObj]) => {
      nodeLookup[classObj.classId] = graph.nodes.length;
      graph.nodes.push(classObj);
      if (classObj.type === 'Edge') {
        edgeClasses.push(classObj);
      } else if (classObj.type === 'Node') {
        // TODO: create a "potential" connection + dummy node
      }
    });

    // Create the list of connections
    edgeClasses.forEach(edgeClass => {
      if (edgeClass.sourceClassId !== null) {
        graph.edges.push({
          id: `${edgeClass.sourceClassId}>${edgeClass.classId}`,
          source: nodeLookup[edgeClass.sourceClassId],
          target: nodeLookup[edgeClass.classId],
          directed: edgeClass.directed
        });
      } else {
        // TODO: create a "potential" connection + dummy node
      }
      if (edgeClass.targetClassId !== null) {
        graph.edges.push({
          id: `${edgeClass.classId}>${edgeClass.targetClassId}`,
          source: nodeLookup[edgeClass.classId],
          target: nodeLookup[edgeClass.targetClassId],
          directed: edgeClass.directed
        });
      } else {
        // TODO: create a "potential" connection + dummy node
      }
    });

    return graph;
  }
}

export default NetworkModelGraph;
