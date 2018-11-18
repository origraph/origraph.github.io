import PersistentGraph from './PersistentGraph.js';

class InstanceGraph extends PersistentGraph {
  constructor () {
    super();
    this._instances = null;
  }
  keyFunction ({ node, dummy }) {
    return dummy ? null : node.instanceId;
  }
  contains (instance) {
    return this._instances && !!this._instances[instance.instanceId];
  }
  async unseed (instances) {
    if (!this._instances) {
      return;
    }
    if (!(instances instanceof Array)) {
      instances = [ instances ];
    }
    // Unseed each instance
    for (const instance of instances) {
      delete this._instances[instance.instanceId];
      // When a node is un-seeded, un-seed any of its edges that have that node
      // as its only source or target (i.e. we only want to see floating edges
      // in the instance model view that are actually floating in the network
      // model)
      if (instance.type === 'Node') {
        for await (const edge of instance.edges()) {
          if (this._instances[edge.instanceId]) {
            let otherSourceExists = false;
            let otherTargetExists = false;
            for await (const node of edge.sourceNodes()) {
              if (node !== instance) {
                otherSourceExists = true;
                break;
              }
            }
            for await (const node of edge.targetNodes()) {
              if (node !== instance) {
                otherTargetExists = true;
                break;
              }
            }
            if (!otherSourceExists || !otherTargetExists) {
              delete this._instances[edge.instanceId];
            }
          }
        }
      }
    }
    if (Object.keys(this._instances).length === 0) {
      this._instances = null;
    }
    await this.update();
  }
  async seed (instances) {
    if (!(instances instanceof Array)) {
      instances = [ instances ];
    }
    this._instances = this._instances || {};
    const newNodes = {};
    for (const instance of instances) {
      this._instances[instance.instanceId] = instance;
      if (instance.type === 'Node') {
        newNodes[instance.instanceId] = true;
      } else if (instance.type === 'Edge') {
        // Add source and target nodes when we seed edges
        for await (const node of instance.sourceNodes()) {
          this._instances[node.instanceId] = node;
        }
        for await (const node of instance.targetNodes()) {
          this._instances[node.instanceId] = node;
        }
      }
    }
    // Add any edges that connect new nodes to existing ones
    for (const newNodeId of Object.keys(newNodes)) {
      for await (const edge of this._instances[newNodeId].edges()) {
        if (!this._instances[edge.instanceId]) {
          let sourceExists = false;
          let targetExists = false;
          for await (const node of edge.sourceNodes()) {
            if (this._instances[node.instanceId]) {
              sourceExists = true;
              break;
            }
          }
          for await (const node of edge.targetNodes()) {
            if (this._instances[node.instanceId]) {
              targetExists = true;
              break;
            }
          }
          if (sourceExists && targetExists) {
            this._instances[edge.instanceId] = edge;
          }
        }
      }
    }
    await this.update();
  }
  async deriveGraph () {
    const instanceList = this._instances ? Object.values(this._instances) : null;
    return window.origraph.currentModel.getInstanceGraph(instanceList);
  }
}

export default InstanceGraph;
