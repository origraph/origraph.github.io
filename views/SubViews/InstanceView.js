/* globals d3, origraph */
import GoldenLayoutView from './GoldenLayoutView.js';
import ZoomableSvgViewMixin from './ZoomableSvgViewMixin.js';

const NODE_SIZE = 7;

const REPULSION = node => {
  if (node.nodeInstance) {
    const instanceId = node.nodeInstance.instanceId;
    if (window.mainView.highlightedInstance &&
        window.mainView.highlightedInstance.instanceId === instanceId) {
      return -(NODE_SIZE ** 4);
    } else if (window.mainView.highlightedPool && window.mainView.highlightedPool[instanceId]) {
      return -(NODE_SIZE ** 3);
    }
  }
  return -(NODE_SIZE ** 2);
};

const FORCES = {
  link: d3.forceLink(),
  charge: d3.forceManyBody().strength(REPULSION),
  forceX: d3.forceX().strength(0.1),
  forceY: d3.forceY().strength(0.1),
  collide: d3.forceCollide().radius(NODE_SIZE)
};

class InstanceView extends ZoomableSvgViewMixin(GoldenLayoutView) {
  constructor ({ container, state }) {
    super({
      container,
      icon: InstanceView.icon,
      label: InstanceView.label,
      state
    });
  }
  isEmpty () {
    return Object.values(origraph.currentModel.classes)
      .filter(d => d.type === 'Node' || d.type === 'Edge').length === 0;
  }
  setup () {
    super.setup();

    this.emptyStateDiv.html(`<h3>At least one node or edge class is needed to sample the graph</h3>`)
      .style('display', null);

    this.content.append('g')
      .classed('edgeLayer', true);
    this.content.append('g')
      .classed('nodeLayer', true);

    this.controls = d3.select(this.content.node().parentNode).append('div')
      .classed('controls', true);
    this.setupButtons();

    this.simulation = d3.forceSimulation();
    for (const [ forceName, forceObj ] of Object.entries(FORCES)) {
      this.simulation.force(forceName, forceObj);
    }
    window.mainView.instanceGraph.on('update', () => {
      this.simulation.alpha(0.3).restart();
      this.render();
    });
  }
  setupButtons () {
    const controls = [
      {
        label: 'Default Sampling',
        icon: 'img/defaultSamples.svg',
        onClick: () => {
          window.mainView.instanceGraph.reset();
        },
        disabled: () => !origraph.currentModel ||
          Object.values(origraph.currentModel.classes)
            .every(classObj => classObj.type === 'Generic'),
        selected: () => window.mainView.instanceGraph.isReset
      },
      {
        label: 'Clear',
        icon: 'img/null.svg',
        onClick: () => {
          window.mainView.instanceGraph.clear();
        },
        disabled: () => !origraph.currentModel ||
          Object.values(origraph.currentModel.classes)
            .every(classObj => classObj.type === 'Generic'),
        selected: () => window.mainView.instanceGraph.isClear
      },
      {
        label: 'Seed Neighborhood',
        icon: 'img/neighborhood.svg',
        onClick: () => {
          if (window.mainView.highlightedPool) {
            window.mainView.instanceGraph.seed(Object.keys(window.mainView.highlightedPool));
          }
        },
        disabled: () => !window.mainView.highlightedPool
      }
    ];
    let buttons = this.controls.selectAll('.button').data(controls);
    buttons.exit().remove();
    const buttonsEnter = buttons.enter().append('div')
      .classed('button', true);
    buttons = buttons.merge(buttonsEnter);

    buttonsEnter.append('a').append('img');
    buttons.select('img').attr('src', d => d.icon);
    buttons.on('mouseenter', function (d) {
      window.mainView.showTooltip({
        content: d.label,
        targetBounds: this.getBoundingClientRect()
      });
    }).on('click', (d) => { d.onClick(); });
  }
  drawButtons () {
    this.controls.selectAll('.button')
      .classed('disabled', d => d.disabled && d.disabled());
    this.controls.selectAll('.button')
      .classed('selected', d => d.selected && d.selected());
  }
  draw () {
    super.draw();
    const bounds = this.getContentBounds(this.content);

    this.drawButtons();

    let nodes = this.content.select('.nodeLayer')
      .selectAll('.node').data(window.mainView.instanceGraph.nodes);
    nodes.exit().remove();
    const nodesEnter = nodes.enter().append('g')
      .classed('node', true);
    nodes = nodes.merge(nodesEnter);

    nodesEnter.append('circle')
      .attr('r', NODE_SIZE);
    nodes.select('circle')
      .attr('fill', d => d.nodeInstance && d.nodeInstance.classObj.annotations.color
        ? '#' + d.nodeInstance.classObj.annotations.color : '#BDBDBD');

    nodesEnter.append('text')
      .attr('y', '1.35em')
      .attr('text-anchor', 'middle');
    nodes.select('text')
      .text(d => d.nodeInstance ? d.nodeInstance.label : '');

    nodes.classed('highlighted', d => d.nodeInstance &&
      window.mainView.highlightedInstance &&
      window.mainView.highlightedInstance.instanceId === d.nodeInstance.instanceId);
    nodes.classed('pooled', d => d.nodeInstance &&
      window.mainView.highlightedPool &&
      window.mainView.highlightedPool[d.nodeInstance.instanceId]);
    nodes.classed('dummy', d => d.dummy)
      .call(d3.drag()
        .on('start', d => {
          if (!d3.event.active) {
            this.simulation.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
          // Initiate linked highlighting
          if (d.nodeInstance) {
            window.mainView.highlightInstance(d.nodeInstance, this);
          } else {
            window.mainView.clearHighlightInstance();
          }
        }).on('drag', d => {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        }).on('end', d => {
          if (!d3.event.active) {
            this.simulation.alphaTarget(0);
          }
          delete d.fx;
          delete d.fy;
          // After dragging, update the highlighted pool
          if (d.nodeInstance) {
            window.mainView.highlightPool(d.nodeInstance);
          }
        }));

    let edges = this.content.select('.edgeLayer')
      .selectAll('.edge').data(window.mainView.instanceGraph.edges);
    edges.exit().remove();
    const edgesEnter = edges.enter().append('g')
      .classed('edge', true);
    edges = edges.merge(edgesEnter);

    edgesEnter.append('path')
      .classed('line', true);
    edges.select('.line')
      .attr('stroke', d => d.edgeInstance.classObj.annotations.color
        ? '#' + d.edgeInstance.classObj.annotations.color : '#BDBDBD');

    edges.on('click', d => {
      window.mainView.highlightInstance(d.edgeInstance, this);
      window.mainView.highlightPool(d.edgeInstance);
    });

    edges.classed('highlighted', d => window.mainView.highlightedInstance &&
      window.mainView.highlightedInstance.instanceId === d.edgeInstance.instanceId);

    this.simulation.on('tick', () => {
      edges.select('.line')
        .attr('d', d => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    this.simulation.nodes(window.mainView.instanceGraph.nodes);
    this.simulation.force('link').links(window.mainView.instanceGraph.edges);
    this.simulation.force('forceX').x(bounds.width / 2);
    this.simulation.force('forceY').y(bounds.height / 2);
    this.simulation.force('charge').strength(REPULSION);
  }
}
InstanceView.icon = 'img/instanceView.svg';
InstanceView.label = 'Topology Sample';
export default InstanceView;
