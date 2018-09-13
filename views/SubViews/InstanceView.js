/* globals d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

const NODE_SIZE = 5;

class InstanceView extends SvgViewMixin(GoldenLayoutView) {
  constructor ({ container, state }) {
    super({
      container,
      icon: InstanceView.icon,
      label: InstanceView.label,
      state
    });
  }
  isEmpty () {
    return window.mainView.instances && window.mainView.instances.length === 0;
  }
  setup () {
    super.setup();
    this.content.append('g')
      .classed('edgeLayer', true);
    this.content.append('g')
      .classed('nodeLayer', true);
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink()) // .distance(50)) //.id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-NODE_SIZE))
      .force('center', d3.forceCenter())
      .force('collide', d3.forceCollide().radius(NODE_SIZE));
    window.mainView.on('seed', () => {
      this.simulation.alpha(0.3).restart();
      this.render();
    });
  }
  async draw () {
    const graph = await this.deriveGraph();
    const bounds = this.getContentBounds(this.content);

    let nodes = this.content.select('.nodeLayer')
      .selectAll('.node').data(graph.nodes);
    nodes.exit().remove();
    const nodesEnter = nodes.enter().append('g')
      .classed('node', true);
    nodes = nodes.merge(nodesEnter);

    nodesEnter.append('circle')
      .attr('r', NODE_SIZE);
    nodes.classed('dummy', d => d.dummy);

    let edges = this.content.select('.edgeLayer')
      .selectAll('.edge').data(graph.edges);
    edges.exit().remove();
    const edgesEnter = edges.enter().append('g')
      .classed('edge', true);
    edges = edges.merge(edgesEnter);

    edgesEnter.append('path')
      .classed('line', true);

    this.simulation.on('tick', () => {
      edges.select('.line')
        .attr('d', d => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    this.simulation.nodes(graph.nodes);
    this.simulation.force('link').links(graph.edges);
    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);
  }
  async deriveGraph () {
    const graph = {
      nodes: [],
      edges: []
    };
    const nodeLookup = {};
    if (window.mainView.instances === null) {
      // The user has never directly interacted with the instance view, so
      // we should pick some smart default. TODO: fancy graph sampling
      return graph;
    } else {
      const edgeTableEntries = [];
      for (const instance of window.mainView.instances) {
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
          if (nodeLookup[sourceId]) {
            sources.push(nodeLookup[sourceId]);
          }
        }
        const targets = [];
        for await (const target of edgeTableInstance.targetNodes()) {
          const targetId = target.table.tableId + target.index;
          if (nodeLookup[targetId]) {
            sources.push(nodeLookup[targetId]);
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
}
InstanceView.icon = 'img/instanceView.svg';
InstanceView.label = 'Topology Sample';
export default InstanceView;
