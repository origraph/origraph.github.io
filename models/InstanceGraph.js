import PersistentGraph from './PersistentGraph.js';

class InstanceGraph extends PersistentGraph {
  constructor () {
    super();
    this._instances = null;
  }
  get instances () {
    if (this._instances === null) {
      // The user has never directly interacted with the instance view, so
      // we should pick some smart default. TODO: fancy graph sampling
      return [];
    } else {
      return Object.values(this._instances);
    }
  }
  contains (instance) {
    return this._instances && !!this._instances[this.getInstanceId(instance)];
  }
  async unseed (instances) {
    if (!this.instances) {
      return;
    }
    if (!(instances instanceof Array)) {
      instances = [ instances ];
    }
    // Unseed each instance
    for (const instance of instances) {
      delete this._instances[this.getInstanceId(instance)];
      // When a node is un-seeded, un-seed any of its edges that have that node
      // as its only source or target (i.e. we only want to see floating edges
      // in the instance model view that are actually floating in the network
      // model)
      if (instance.type === 'Node') {
        for await (const edge of instance.edges()) {
          const edgeId = this.getInstanceId(edge);
          if (this._instances[edgeId]) {
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
              delete this._instances[edgeId];
            }
          }
        }
      }
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
      const id = this.getInstanceId(instance);
      this._instances[id] = instance;
      if (instance.type === 'Node') {
        newNodes[id] = true;
      } else if (instance.type === 'Edge') {
        // Add source and target nodes when we seed edges
        for await (const node of instance.sourceNodes()) {
          const nodeId = this.getInstanceId(node);
          this._instances[nodeId] = node;
        }
        for await (const node of instance.targetNodes()) {
          const nodeId = this.getInstanceId(node);
          this._instances[nodeId] = node;
        }
      }
    }
    // Add any edges that connect new nodes to existing ones
    for (const newNodeId of Object.keys(newNodes)) {
      for await (const edge of this._instances[newNodeId].edges()) {
        const edgeId = this.getInstanceId(edge);
        if (!this._instances[edgeId]) {
          let sourceExists = false;
          let targetExists = false;
          for await (const node of edge.sourceNodes()) {
            const nodeId = this.getInstanceId(node);
            if (this._instances[nodeId]) {
              sourceExists = true;
              break;
            }
          }
          for await (const node of edge.targetNodes()) {
            const nodeId = this.getInstanceId(node);
            if (this._instances[nodeId]) {
              targetExists = true;
              break;
            }
          }
          if (sourceExists && targetExists) {
            this._instances[edgeId] = edge;
          }
        }
      }
    }
    await this.update();
  }
  getInstanceId (instance) {
    return instance.classObj.classId + '_' + instance.index;
  }
  keyFunction (node) {
    if (node.dummy) {
      return null;
    } else {
      return this.getInstanceId(node.nodeTableInstance);
    }
  }
  async deriveGraph () {
    const graph = {
      nodes: [],
      edges: []
    };
    const nodeLookup = {};
    const edgeTableEntries = [];
    for (const instance of this.instances) {
      if (instance.type === 'Node') {
        const nodeId = this.getInstanceId(instance);
        nodeLookup[nodeId] = graph.nodes.length;
        graph.nodes.push({
          nodeTableInstance: instance,
          dummy: false
        });
      } else if (instance.type === 'Edge') {
        edgeTableEntries.push(instance);
      }
    }
    for (const edgeTableInstance of edgeTableEntries) {
      const sources = [];
      for await (const source of edgeTableInstance.sourceNodes()) {
        const sourceId = this.getInstanceId(source);
        if (nodeLookup[sourceId] !== undefined) {
          sources.push(nodeLookup[sourceId]);
        }
      }
      const targets = [];
      for await (const target of edgeTableInstance.targetNodes()) {
        const targetId = this.getInstanceId(target);
        if (nodeLookup[targetId] !== undefined) {
          targets.push(nodeLookup[targetId]);
        }
      }
      if (sources.length === 0) {
        if (targets.length === 0) {
          // We have completely hanging edges, make dummy nodes for the
          // source and target
          graph.edges.push({
            edgeTableInstance,
            source: graph.nodes.length,
            target: graph.nodes.length + 1
          });
          graph.nodes.push({ dummy: true });
          graph.nodes.push({ dummy: true });
        } else {
          // The sources are hanging, but we have targets
          for (const target of targets) {
            graph.edges.push({
              edgeTableInstance,
              source: graph.nodes.length,
              target
            });
            graph.nodes.push({ dummy: true });
          }
        }
      } else if (targets.length === 0) {
        // The targets are hanging, but we have sources
        for (const source of sources) {
          graph.edges.push({
            edgeTableInstance,
            source,
            target: graph.nodes.length
          });
          graph.nodes.push({ dummy: true });
        }
      } else {
        // Neither the source, nor the target are hanging
        for (const source of sources) {
          for (const target of targets) {
            graph.edges.push({
              edgeTableInstance,
              source,
              target
            });
          }
        }
      }
    }
    return graph;
  }
}

export default InstanceGraph;
