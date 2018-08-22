/* globals mure, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

const NODE_SIZE = 70;

class NetworkModelView extends SvgViewMixin(GoldenLayoutView) {
  constructor ({ container, state }) {
    super({
      container,
      icon: NetworkModelView.icon,
      label: NetworkModelView.label
    });
  }
  isEmpty () {
    return Object.keys(mure.classes).length === 0;
  }
  setup () {
    super.setup();
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-NODE_SIZE))
      .force('center', d3.forceCenter())
      .force('collide', d3.forceCollide());

    this.linkLayer = this.content.append('g').classed('linkLayer', true);
    this.nodeLayer = this.content.append('g').classed('nodeLayer', true);
  }
  draw () {
    const bounds = this.getContentBounds(this.content);
    const graph = this.deriveGraph();

    // TODO: draw / update nodes, edges, and forces

    /*
    let nodes = this.nodeLayer.selectAll('.node')
      .data(graph.nodes, d => d.className);
    nodes.exit().remove();
    let nodesEnter = nodes.enter().append('g')
      .classed('node', true);
    nodes = nodes.merge(nodesEnter);
    nodesEnter.append('circle');
    nodes.select('circle').attr('r', NODE_SIZE);

    let links = this.linkLayer.selectAll('.link')
      .data(graph.links, d => d.className);
    links.exit().remove();
    let linksEnter = links.enter().append('g')
      .classed('link', true);
    links = links.merge(linksEnter);
    linksEnter.append('path');

    const hover = function (d) {
      window.mainView.showTooltip({
        content: d.key,
        targetBounds: this.getBoundingClientRect()
      });
      d3.select(this).classed('hovered', true);
    };
    const unhover = function () {
      window.mainView.hideTooltip();
      d3.select(this).classed('hovered', false);
    };
    const click = async d => {
      window.mainView.setUserSelection(await this.location.filter({
        className: d.key
      }));
    };
    nodes.on('mouseover', hover);
    links.on('mouseover', hover);
    nodes.on('mouseout', unhover);
    links.on('mouseout', unhover);
    nodes.on('click', click);
    links.on('click', click);

    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);
    this.simulation.on('tick', () => {
      nodes.attr('transform', d => {
        const node = graph.nodes[graph.nodeLookup['node' + d.key]];
        return `translate(${node.x},${node.y})`;
      });
      links.select('path').attr('d', d => {
        let links = graph.linkLookup['link' + d.key];
        return this.computeHyperlinkPath({
          link: graph.nodes[graph.nodeLookup['link' + d.key]],
          sourceLinks: links.sources.map(i => graph.links[i]),
          targetLinks: links.targets.map(i => graph.links[i]),
          undirecteds: links.undirecteds.map(i => graph.links[i])
        });
      });
    });
    this.simulation.nodes(graph.nodes);
    this.simulation.force('link')
      .links(graph.links);
      */
  }
  /*
  computeHyperlinkPath ({ link, sourceLinks, targetLinks, undirecteds }) {
    let sourceX = 0;
    let sourceY = 0;
    let targetX = 0;
    let targetY = 0;
    sourceLinks.forEach(d => {
      sourceX += d.target.x - d.source.x;
      sourceY += d.target.y - d.source.y;
    });
    const thetaIn = Math.atan2(sourceY, sourceX);
    targetLinks.forEach(d => {
      targetX += d.target.x - d.source.x;
      targetY += d.target.y - d.source.y;
    });
    const thetaOut = Math.atan2(targetY, targetX);
    const theta = (thetaIn + thetaOut) / 2;
    const anchorOffset = {
      x: NODE_SIZE * Math.cos(theta),
      y: NODE_SIZE * Math.sin(theta)
    };
    let sourceSegments = sourceLinks.map(d => `\
M${d.source.x},${d.source.y}\
Q${d.target.x - anchorOffset.x},${d.target.y - anchorOffset.y},
${d.target.x},${d.target.y}`);
    return sourceSegments + targetLinks.map(d => `\
M${d.source.x},${d.source.y}\
Q${d.source.x + anchorOffset.x},${d.source.y + anchorOffset.y},
${d.target.x},${d.target.y}`);
}
*/
  deriveGraph () {
    const edgeClasses = [];
    const nodeLookup = {}; // maps a class selector to an index in graph.nodes
    let graph = {
      nodes: [],
      links: []
    };

    // Create nodes + pseudo-nodes
    Object.entries(mure.classes).forEach(([selector, classObj]) => {
      nodeLookup[classObj.selector] = graph.nodes.length;
      graph.nodes.push(classObj);
      if (classObj.type === 'Edge') {
        edgeClasses.push(classObj);
      }
    });

    // Get any links that exist
    edgeClasses.forEach(edgeClass => {
      if (edgeClass.sourceSelector !== null) {
        graph.links.push({
          source: nodeLookup[edgeClass.sourceSelector],
          target: nodeLookup[edgeClass.selector],
          directed: edgeClass.directed
        });
      }
      if (edgeClass.targetSelector !== null) {
        graph.links.push({
          source: nodeLookup[edgeClass.selector],
          target: nodeLookup[edgeClass.targetSelector],
          directed: edgeClass.directed
        });
      }
    });

    return graph;
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;
