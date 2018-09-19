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
  zoom () {
    this.content.selectAll('.nodeLayer,.edgeLayer')
      .attr('transform', d3.event.transform);
  }
  setup () {
    super.setup();
    this.content.append('g')
      .classed('edgeLayer', true);
    this.content.append('g')
      .classed('nodeLayer', true);
    this.content.call(d3.zoom()
      .scaleExtent([1 / 4, 4])
      .on('zoom', () => { this.zoom(); }));
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink()) // .distance(50)) //.id(d => d.id))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter())
      .force('collide', d3.forceCollide().radius(NODE_SIZE));
    window.mainView.instanceGraph.on('update', () => {
      this.simulation.alpha(0.3).restart();
      this.render();
    });
  }
  draw () {
    const bounds = this.getContentBounds(this.content);

    let nodes = this.content.select('.nodeLayer')
      .selectAll('.node').data(window.mainView.instanceGraph.nodes);
    nodes.exit().remove();
    const nodesEnter = nodes.enter().append('g')
      .classed('node', true);
    nodes = nodes.merge(nodesEnter);

    nodesEnter.append('circle')
      .attr('r', NODE_SIZE);
    nodes.classed('dummy', d => d.dummy)
      .call(d3.drag()
        .on('start', d => {
          if (!d3.event.active) {
            this.simulation.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        }).on('drag', d => {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        }).on('end', d => {
          if (!d3.event.active) {
            this.simulation.alphaTarget(0);
          }
          delete d.fx;
          delete d.fy;
        }));

    let edges = this.content.select('.edgeLayer')
      .selectAll('.edge').data(window.mainView.instanceGraph.edges);
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

    this.simulation.nodes(window.mainView.instanceGraph.nodes);
    this.simulation.force('link').links(window.mainView.instanceGraph.edges);
    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);
  }
}
InstanceView.icon = 'img/instanceView.svg';
InstanceView.label = 'Topology Sample';
export default InstanceView;
