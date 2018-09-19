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
      return this._instances;
    }
  }
  async seed (instances) {
    if (!(instances instanceof Array)) {
      instances = [ instances ];
    }
    this._instances = this._instances || [];
    for (const instance of instances) {
      // TODO: more efficient set union?
      if (this.instances.indexOf(instance) === -1) {
        this.instances.push(instance);
      }
    }
    await this.update();
    this.trigger('update');
  }
  keyFunction (node) {
    if (node.dummy) {
      return null;
    } else {
      return node.nodeTableInstance.table.tableId + node.nodeTableInstance.index;
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
        const nodeId = instance.table.tableId + instance.index;
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
        const sourceId = source.table.tableId + source.index;
        if (nodeLookup[sourceId] !== undefined) {
          sources.push(nodeLookup[sourceId]);
        }
      }
      const targets = [];
      for await (const target of edgeTableInstance.targetNodes()) {
        const targetId = target.table.tableId + target.index;
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
