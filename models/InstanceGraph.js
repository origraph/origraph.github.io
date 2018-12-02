/* globals origraph */
import PersistentGraph from './PersistentGraph.js';

class InstanceGraph extends PersistentGraph {
  constructor () {
    super();
    this._instanceIds = null;
  }
  keyFunction (instanceId) {
    return instanceId;
  }
  contains (instanceId) {
    return this._instanceIds && !!this._instanceIds[instanceId];
  }
  async purge () {
    this._instanceIds = null;
    await this.update();
  }
  async unseed (instanceIds) {
    if (!this._instanceIds) {
      return;
    }
    if (!(instanceIds instanceof Array)) {
      instanceIds = [ instanceIds ];
    }
    // Unseed each instance. Additionally, if it's a node, unseed all of its
    // neighboring edges, or if it's an edge, unseed its neighboring nodes
    for (const instanceId of instanceIds) {
      delete this._instanceIds[instanceId];
      const { classId, index } = JSON.parse(instanceId);
      if (origraph.currentModel.classes[classId]) {
        const instance = origraph.currentModel.classes[classId].table.getItem(index);
        if (instance.type === 'Node') {
          for (const edge of instance.edges()) {
            delete this._instanceIds[edge.instanceId];
          }
        } else if (instance.type === 'Edge') {
          for (const node of instance.nodes()) {
            delete this._instanceIds[node.instanceId];
          }
        }
      }
    }
    if (Object.keys(this._instanceIds).length === 0) {
      this._instanceIds = null;
    }
    await this.update();
  }
  async seed (instanceIds) {
    if (!(instanceIds instanceof Array)) {
      instanceIds = [ instanceIds ];
    }
    this._instanceIds = this._instanceIds || {};
    for (const instanceId of instanceIds) {
      this._instanceIds[instanceId] = true;
    }
    await this.update();
  }
  async deriveGraph () {
    const instanceIdList = this._instanceIds ? Object.keys(this._instanceIds) : null;
    return window.origraph.currentModel.getInstanceGraph(instanceIdList);
  }
}

export default InstanceGraph;
