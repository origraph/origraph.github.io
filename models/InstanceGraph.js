/* globals origraph */
import PersistentGraph from './PersistentGraph.js';

const MODES = {
  CUSTOM: 'CUSTOM',
  EMPTY: 'EMPTY',
  FULL_CLASS: 'FULL_CLASS',
  DEFAULT: 'DEFAULT'
};

class InstanceGraph extends PersistentGraph {
  constructor () {
    super();
    this._mode = MODES.DEFAULT;
    this.currentSample = null;
    this.highlightedSample = {};
    this.highlightNeighbors = {};
    this.seededClass = null;
    this.doDefaultSampling();
  }
  keyFunction (container) {
    return container.nodeInstance ? container.nodeInstance.instanceId
      : container.edgeInstance ? container.edgeInstance.instanceId
        : container;
  }
  get mode () {
    if (this.currentSample && Object.keys(this.currentSample).length === 0) {
      return MODES.EMPTY;
    } else {
      return this._mode;
    }
  }
  get highlightCount () {
    return Object.keys(this.highlightedSample).length;
  }
  async highlight (sample) {
    this.highlightedSample = sample;
    this.highlightNeighbors = {};
    await this.waitFor(['updateInstanceSample']);
    // Update the neighbors for styling purposes
    for (const instance of Object.values(sample)) {
      if (instance.type === 'Node') {
        for await (const neighborNode of instance.neighborNodes()) {
          this.highlightNeighbors[neighborNode.instanceId] = neighborNode;
        }
      } else if (instance.type === 'Edge') {
        for await (const node of instance.nodes()) {
          this.highlightNeighbors[node.instanceId] = node;
        }
      }
    }
  }
  async reset () {
    this._mode = MODES.DEFAULT;
    this.currentSample = null;
    this.highlightedSample = {};
    this.highlightNeighbors = {};
    this.seededClass = null;
    return this.doDefaultSampling();
  }
  async clear () {
    this._mode = MODES.EMPTY;
    this.currentSample = {};
    this.highlightedSample = {};
    this.highlightNeighbors = {};
    this.seededClass = null;
    this.cancelWaiting();
    await this.update();
  }
  async unseed (sample) {
    if (!this.currentSample) {
      // Can't remove from a sample that we're waiting for
      return;
    }
    this._mode = MODES.CUSTOM;
    this.seededClass = null;
    await this.waitFor(['updateInstanceSample']);
    // Unseed each instance. Additionally, if it's a node, unseed all of its
    // neighboring edges
    for (const instanceId of Object.keys(sample)) {
      const instance = this.currentSample[instanceId];
      delete this.currentSample[instanceId];
      delete this.highlightedSample[instanceId];
      delete this.highlightNeighbors[instanceId];
      if (instance.type === 'Node') {
        for await (const edge of instance.edges()) {
          delete this.currentSample[edge.instanceId];
          delete this.highlightedSample[edge.instanceId];
          delete this.highlightNeighbors[instanceId];
        }
      }
    }
    await this.update();
  }
  async seed (sample, finish = true) {
    if (!this.currentSample) {
      // If the user clicked fast enough to seed something before a default sample
      // loads, just roll with it and don't bother collecting the default sample
      // in the first place
      this.currentSample = {};
      this.cancelWaiting();
    }
    this._mode = MODES.CUSTOM;
    this.seededClass = null;
    // Merge the new sample, and then make sure everything is updated
    Object.assign(this.currentSample, sample);
    await this.waitFor(['updateInstanceSample']);
    // If we seeded any edges directly, we need to make sure to seed ALL of
    // those edges' nodes as well
    for (const instanceId of Object.keys(sample)) {
      const instance = this.currentSample[instanceId];
      if (instance.type === 'Edge') {
        for await (const node of instance.nodes()) {
          this.currentSample[node.instanceId] = node;
        }
      }
    }

    if (finish) {
      // Highlight the new seeded instances
      await this.highlight(sample);
      // Flesh out the results
      await this.waitFor(['fillInstanceSample']);
      await this.update();
    }
  }
  async seedNeighbors (sample) {
    // First ensure the sample itself is seeded, and that everything is up to date
    // (but don't bother finishing, as we want to add neighbors before those bits)
    await this.seed(sample, false);
    // Seed the sample's neighbors
    for (const instance of Object.values(sample)) {
      for await (const neighbor of instance.neighbors()) {
        this.currentSample[neighbor.instanceId] = neighbor;
        // If the neighbor is an edge, include all of the edge's nodes
        if (neighbor.type === 'Edge') {
          for await (const node of neighbor.nodes()) {
            this.currentSample[node.instanceId] = node;
          }
        }
      }
    }
    // Highlight the new seeded instances
    await this.highlight(sample);
    // Flesh out the results
    await this.waitFor(['fillInstanceSample']);
    await this.update();
  }
  async seedClass (classObj) {
    this._mode = MODES.FULL_CLASS;
    this.seededClass = classObj;
    this.cancelWaiting();

    this.currentSample = {};
    for await (const instance of classObj.table.iterate()) {
      this.currentSample[instance.instanceId] = instance;
      // Include all neighbor nodes if this is an edge class
      if (this.seededClass.type === 'Edge') {
        for await (const node of instance.nodes()) {
          this.currentSample[node.instanceId] = node;
        }
      }
    }
    // When seeding a whole class, don't highlight anything
    this.highlightedSample = {};
    this.highlightNeighbors = {};
    // Fill in the graph
    await this.waitFor(['fillInstanceSample']);
    await this.update();
  }
  async doDefaultSampling () {
    if (origraph.currentModel === null) {
      // We're in the middle of switching to a new empty model; try sampling
      // again in about two seconds (if we're still in default mode at that point)
      return new Promise((resolve, reject) => {
        window.setTimeout(() => {
          resolve(this._mode === MODES.DEFAULT ? this.doDefaultSampling() : null);
        }, 2000);
      });
    }
    await this.waitFor(['getInstanceSample', 'fillInstanceSample']);
    await this.update();
  }
  cancelWaiting () {
    delete this._waitPromise;
  }
  async waitFor (commandList, firstTry = true) {
    // "Atomically" attempt to execute the provided commands in order; as each
    // may potentially return null if caches are reset, start over after a delay
    // if any of them fail
    if (!firstTry && (!this._waitPromise || this._currentModel !== origraph.currentModel || origraph.currentModel === null)) {
      // cancelWaiting() was called, or the whole model got swapped out; we can
      // just give up
      delete this._waitPromise;
      window.clearTimeout(this._waitTimeout);
      delete this._currentModel;
      return null;
    }
    this._currentModel = origraph.currentModel;
    this._waitPromise = new Promise((resolve, reject) => {
      window.clearTimeout(this._waitTimeout);
      this._waitTimeout = window.setTimeout(async () => {
        let tempSample = Object.assign({}, this.currentSample);
        for (const command of commandList) {
          tempSample = await origraph.currentModel[command](tempSample);
          if (tempSample === null) {
            // Shoot, something broke; try the whole commandList again from the beginning
            resolve(await this.waitFor(commandList, false));
            break;
          }
        }
        if (tempSample !== null) {
          // We made it through without any resets!
          this.currentSample = tempSample;
          delete this._waitPromise;
          window.clearTimeout(this._waitTimeout);
          delete this._currentModel;
          resolve(this.currentSample);
        }
      }, firstTry ? 0 : 1000); // try to execuete immediately on the first try, otherwise wait a second
    });
    return this._waitPromise;
  }
  async deriveGraph () {
    if (!this.currentSample) {
      // Just return an empty graph for now if we're waiting
      return { nodes: [], nodeLookup: {}, edges: [] };
    }
    await this.waitFor(['updateInstanceSample']);
    return origraph.currentModel.instanceSampleToGraph(this.currentSample);
  }
}

export default InstanceGraph;
