/* globals d3 */
import GoldenLayoutView from './Common/GoldenLayoutView.js';
import LocatedViewMixin from './Common/LocatedViewMixin.js';
import SvgViewMixin from './Common/SvgViewMixin.js';

class NetworkModelView extends SvgViewMixin(LocatedViewMixin(GoldenLayoutView)) {
  constructor (container, { locationSelectorList }) {
    super(container, {
      icon: NetworkModelView.icon,
      label: NetworkModelView.label,
      locationSelectorList
    });
  }
  setup () {
    super.setup();
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id))
      .force('charge', d3.forceManyBody());
  }
  async getEmptyState () {
    const temp = await super.getEmptyState();
    if (temp) { return temp; }
    const networkModel = await window.mainView.userSelection.getFlatGraphSchema();
    if (Object.keys(networkModel.nodeClasses).length === 0) {
      return emptyStateDiv => {
        emptyStateDiv.html('<img class="emptyState" src="img/noNodesEmptyState.svg"/>');
      };
    }
  }
  async drawReadyState (content) {
    const bounds = this.getContentBounds(content);
    const networkModel = await window.mainView.userSelection.getFlatGraphSchema();
    const graph = this.deriveGraphFromNetworkModel(networkModel);

    let edgeLayer = content.select('.edgeLayer');
    if (!edgeLayer.node()) {
      edgeLayer = content.append('g').classed('edgeLayer', true);
    }
    let nodeLayer = content.select('.nodeLayer');
    if (!nodeLayer.node()) {
      nodeLayer = content.append('g').classed('nodeLayer', true);
    }

    let nodeScale = d3.scaleSqrt()
      .domain([0, d3.max(d3.values(networkModel.nodeClasses), d => d.count)])
      .range([0, 20]); // Max radius is 100px
    let nodes = nodeLayer.selectAll('.node')
      .data(d3.entries(networkModel.nodeClasses), d => d.key);
    nodes.exit().remove();
    let nodesEnter = nodes.enter().append('g')
      .classed('node', true);
    nodes = nodes.merge(nodesEnter);
    nodesEnter.append('circle');
    nodes.select('circle').attr('r', d => {
      return nodeScale(d.value.count);
    });

    let edges = edgeLayer.selectAll('.edge')
      .data(d3.entries(networkModel.edgeClasses), d => d.key);
    edges.exit().remove();
    let edgesEnter = edges.enter().append('g')
      .classed('edge', true);
    edges = edges.merge(edgesEnter);
    edgesEnter.append('path');

    this.simulation
      .force('center', d3.forceCenter(bounds.width / 2, bounds.height / 2))
      .nodes(graph.nodes)
      .force('link').links(graph.links);
    this.simulation.on('tick', () => {
      nodes.attr('transform', d => {
        const node = graph.nodes[graph.nodeLookup['node' + d.key]];
        return `translate(${node.x},${node.y})`;
      });
      edges.select('path').attr('d', d => {
        const links = graph.linkLookup['edge' + d.key];
        return this.computeHyperedgePath({
          edge: graph.nodes[graph.nodeLookup['edge' + d.key]],
          sources: links.sources.map(i => graph.links[i]),
          targets: links.targets.map(i => graph.links[i]),
          undirecteds: links.undirecteds.map(i => graph.links[i])
        });
      });
    });
  }
  computeHyperedgePath ({ edge, sources, targets, undirecteds }) {
    console.log(edge);
  }
  deriveGraphFromNetworkModel (networkModel) {
    let graph = {
      nodes: [],
      nodeLookup: {},
      links: [],
      linkLookup: {}
    };
    Object.entries(networkModel.nodeClasses).forEach(([nodeClassName, pseudoItem]) => {
      graph.nodeLookup['node' + nodeClassName] = graph.nodes.length;
      graph.nodes.push({
        id: 'node' + nodeClassName,
        entity: pseudoItem
      });
    });
    Object.entries(networkModel.edgeClasses).forEach(([edgeClassName, pseudoItem]) => {
      graph.nodeLookup['edge' + edgeClassName] = graph.nodes.length;
      graph.nodes.push({
        id: 'edge' + edgeClassName,
        entity: pseudoItem
      });
      graph.linkLookup['edge' + edgeClassName] = graph.linkLookup['edge' + edgeClassName] || {
        sources: [],
        targets: [],
        undirecteds: []
      };
      Object.entries(pseudoItem.$nodes).forEach(([nodeClassName, directions]) => {
        Object.entries(directions).forEach(([direction, count]) => {
          if (direction === 'source') {
            graph.linkLookup['edge' + edgeClassName].sources.push(graph.links.length);
            graph.links.push({
              source: 'node' + nodeClassName,
              target: 'edge' + edgeClassName,
              directed: true,
              count
            });
          } else if (direction === 'target') {
            graph.linkLookup['edge' + edgeClassName].targets.push(graph.links.length);
            graph.links.push({
              source: 'edge' + edgeClassName,
              target: 'node' + nodeClassName,
              directed: true,
              count
            });
          } else { // if (direction === 'undirected') {
            graph.linkLookup['edge' + edgeClassName].undirecteds.push(graph.links.length);
            graph.links.push({
              source: 'edge' + edgeClassName,
              target: 'node' + nodeClassName,
              directed: false,
              count
            });
          }
        });
      });
    });
    return graph;
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;
