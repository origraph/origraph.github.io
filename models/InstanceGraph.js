/* globals origraph */
import PersistentGraph from './PersistentGraph.js';

class InstanceGraph extends PersistentGraph {
  constructor () {
    super();
    this._instanceIds = null;
    this.seededClass = null;
  }
  keyFunction (instance) {
    return instance.nodeInstance ? instance.nodeInstance.instanceId
      : instance.edgeInstance ? instance.edgeInstance.instanceId
        : instance;
  }
  contains (instanceId) {
    return this._instanceIds && !!this._instanceIds[instanceId];
  }
  async reset () {
    this._instanceIds = null;
    this.seededClass = null;
    await this.update();
  }
  get isReset () {
    return this._instanceIds === null;
  }
  async clear () {
    this._instanceIds = {};
    this.seededClass = null;
    await this.update();
  }
  get isClear () {
    return this._instanceIds && Object.keys(this._instanceIds).length === 0;
  }
  async getArbitraryInstanceIds () {
    const idList = await origraph.currentModel.getArbitraryInstanceList();
    const result = {};
    for (const id of idList || []) {
      result[id] = true;
    }
    return result;
  }
  async unseed (instanceIds) {
    if (!this._instanceIds) {
      return;
    }
    if (!(instanceIds instanceof Array)) {
      instanceIds = [ instanceIds ];
    }
    this.seededClass = null;
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
    await this.update();
  }
  async seed (instanceIds) {
    if (!(instanceIds instanceof Array)) {
      instanceIds = [ instanceIds ];
    }
    this._instanceIds = this._instanceIds || await this.getArbitraryInstanceIds() || null;
    this.seededClass = null;
    for (const instanceId of instanceIds) {
      this._instanceIds[instanceId] = true;
    }
    await this.update();
  }
  async seedClass (classObj) {
    this._instanceIds = {};
    this.seededClass = classObj;
    for await (const item of classObj.table.iterate()) {
      this._instanceIds[item.instanceId] = true;
    }
    await this.update();
  }
  async deriveGraph () {
    if (!this._debouncedPromise) {
      this._lastModelId = origraph.currentModel.modelId;
      this._debouncedPromise = new Promise((resolve, reject) => {
        const attempt = async () => {
          if (origraph.currentModel.modelId !== this._lastModelId) {
            this.reset();
            return;
          }
          const instanceIds = this._instanceIds || await this.getArbitraryInstanceIds();
          if (!instanceIds) {
            setTimeout(attempt, 1000);
            return;
          }
          const result = await origraph.currentModel.getInstanceGraph(Object.keys(instanceIds));
          if (result === null) {
            setTimeout(attempt, 1000);
          } else {
            delete this._lastModelId;
            delete this._debouncedPromise;
            resolve(result);
          }
        };
        setTimeout(attempt, 1000);
      });
    }
    return this._debouncedPromise;
  }
}

export default InstanceGraph;
