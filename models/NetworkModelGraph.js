/* globals origraph */
import PersistentGraph from './PersistentGraph.js';

class NetworkModelGraph extends PersistentGraph {
  keyFunction (node) {
    return node.classId;
  }
  async deriveGraph () {
    const graph = origraph.currentModel.getNetworkModelGraph(true);
    return {
      nodes: graph.classes,
      nodeLookup: graph.classLookup,
      edges: graph.classConnections
    };
  }
}

export default NetworkModelGraph;
