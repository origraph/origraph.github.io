import { Model } from '../node_modules/uki/dist/uki.esm.js';

class PersistentGraph extends Model {
  constructor () {
    super();
    this.nodes = [];
    this.edges = [];
  }
  keyFunction (node) {
    throw new Error(`This function should be overridden`);
  }
  async deriveGraph () {
    throw new Error(`This function should be overridden`);
  }
  async update () {
    const existingStats = {};
    for (const node of this.nodes) {
      const key = this.keyFunction(node);
      if (key !== null) {
        existingStats[this.keyFunction(node)] = {
          fx: node.fx,
          fy: node.fy,
          vx: node.vx,
          vy: node.vy,
          x: node.x,
          y: node.y
        };
      }
    }
    const newGraph = await this.deriveGraph();
    for (const node of newGraph.nodes) {
      const key = this.keyFunction(node);
      if (key !== null && existingStats[key]) {
        Object.assign(node, existingStats[key]);
      }
    }
    this.nodes = newGraph.nodes;
    this.edges = newGraph.edges;
    this.trigger('update');
  }
}
export default PersistentGraph;
