/* globals mure, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

const NODE_SIZE = 25;

const OBJECT_PATHS = {
  // Diamond for generic classes
  'Generic': `\
M0,${-NODE_SIZE}
L${NODE_SIZE},0
L0,${NODE_SIZE}
L${-NODE_SIZE},0
Z`,
  // Circle for node classes
  'Node': `\
M0,${-NODE_SIZE}
A${NODE_SIZE},${NODE_SIZE},0,1,1,0,${NODE_SIZE}
A${NODE_SIZE},${NODE_SIZE},0,1,1,0,${-NODE_SIZE}`,
  // No object path for edge classes; these are only represented
  // in the lines layer
  'Edge': ''
};

const DEFAULT_FORCES = {
  link: d3.forceLink(),
  charge: d3.forceManyBody(),
  center: d3.forceCenter(),
  collide: d3.forceCollide().radius(NODE_SIZE)
};

class NetworkModelView extends SvgViewMixin(GoldenLayoutView) {
  constructor ({
    container,
    state
  }) {
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

    this.draggingHandle = false;

    this.simulation = d3.forceSimulation();
    for (const [forceName, force] of Object.entries(DEFAULT_FORCES)) {
      this.simulation.force(forceName, force);
    }

    this.lineLayer = this.content.append('g').classed('lineLayer', true);
    this.objectLayer = this.content.append('g').classed('objectLayer', true);
    this.handleLayer = this.content.append('g').classed('handleLayer', true);

    this.simulation.on('tick', () => {
      this.objectLayer.selectAll('.object')
        .attr('transform', d => `translate(${d.x},${d.y})`);
      this.handleLayer.selectAll('.handleGroup')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    this.container.on('resize', () => {
      this.simulation.alpha(0.3);
    });
  }

  drawLineLayer () {
    // TODO: draw the connections + hanging edges
  }

  drawObjectLayer () {
    // Object groups
    let objects = this.objectLayer.selectAll('.object')
      .data(window.mainView.networkModelGraph.nodes, d => d.classId);
    objects.exit().remove();
    const objectsEnter = objects.enter().append('g');
    objects = objects.merge(objectsEnter);

    // Manually patch the class on (so we can just use classObj.type)
    objects.attr('class', d => `${d.type} object`);

    // Sneaky way for groups in different layers that correspond to
    // the same class to communicate with each other:
    objects.attr('data-class-id', d => d.classId);

    // Dragging behavior (disabled when handles are being dragged)
    objects.call(d3.drag()
      .on('start', d => {
        if (!this.draggingHandle) {
          // disable link, charge, and center forces (keep collision)
          this.simulation.force('link', null);
          this.simulation.force('charge', null);
          // this.simulation.force('center', null);
          if (!d3.event.active) {
            this.simulation.alpha(0.1).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        }
      }).on('drag', d => {
        if (!this.draggingHandle) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        }
      }).on('end', d => {
        if (!this.draggingHandle) {
          // re-enable link, charge, and center forces
          this.simulation.force('link', DEFAULT_FORCES.link);
          this.simulation.force('charge', DEFAULT_FORCES.charge);
          // this.simulation.force('center', DEFAULT_FORCES.center);
          if (!d3.event.active) {
            this.simulation.alpha(0);
          }
          delete d.fx;
          delete d.fy;
        }
      }));

    // Diamond, circle, or line
    objectsEnter.append('path').classed('objectShape', true);
    objects.select('.objectShape').attr('d', d => {
      return OBJECT_PATHS[d.type];
    });

    // Label
    const textGroupEnter = objectsEnter.append('g').classed('textGroup', true);
    textGroupEnter.append('rect'); // background
    textGroupEnter.append('text');
    objects.select('.textGroup').attr('transform',
      d => `translate(0,${d.type === 'Edge' ? 0 : NODE_SIZE + this.emSize})`);
    objects.select('text').text(d => d.className);
    // Patch the string width of Edge classes onto the data, so it's available elsewhere
    objects.each(function (d) {
      d.labelWidth = this.querySelector('text').getBoundingClientRect().width;
    });
    // Size the label background
    objects.select('.textGroup rect')
      .attr('x', d => -d.labelWidth / 2)
      .attr('y', -this.emSize)
      .attr('width', d => d.labelWidth)
      .attr('height', this.emSize);

    // Icons
    const iconGroupEnter = objectsEnter.append('g').classed('icons', true);
    iconGroupEnter.append('image').classed('typeIcon', true);
    iconGroupEnter.append('image').classed('menuIcon', true)
      .attr('xlink:href', d => `img/hamburger.svg`);
    objectsEnter.selectAll('.icons image')
      .attr('width', this.emSize)
      .attr('height', this.emSize)
      .attr('y', d => d.type === 'Edge' ? -2 * this.emSize : -this.emSize / 2);
    objects.select('.typeIcon')
      .attr('xlink:href', d => `img/${d.type.toLowerCase()}.svg`)
      .attr('x', d => d.type === 'Edge' ? d.labelWidth / 2 - 2 * this.emSize : -this.emSize);
    objects.select('.menuIcon')
      .attr('x', d => d.type === 'Edge' ? d.labelWidth / 2 - this.emSize : 0)
      .on('click', function (d) {
        window.mainView.showClassContextMenu({
          classId: d.classId,
          targetBounds: this.getBoundingClientRect()
        });
      });
  }

  drawHandleLayer () {
    // Handle groups
    let handleGroups = this.handleLayer.selectAll('.handleGroup')
      .data(window.mainView.networkModelGraph.nodes, d => d.classId);
    handleGroups.exit().remove();
    const handleGroupsEnter = handleGroups.enter().append('g')
      .classed('handleGroup', true);
    handleGroups = handleGroups.merge(handleGroupsEnter);

    // Sneaky way for groups in different layers that correspond to
    // the same class to communicate with each other:
    handleGroups.attr('data-class-id', d => d.classId);

    // TODO: actually draw the handles
  }

  draw () {
    const bounds = this.getContentBounds(this.content);

    // drawObjectLayer updates labelWidth, so it should be called before
    // anything that relies on labelWidth
    this.drawObjectLayer();
    this.drawLineLayer();
    this.drawHandleLayer();

    this.simulation.nodes(window.mainView.networkModelGraph.nodes);

    if (this.simulation.force('link')) {
      this.simulation.force('link')
        .links(window.mainView.networkModelGraph.edges);
    }
    if (this.simulation.force('center')) {
      this.simulation.force('center')
        .x(bounds.width / 2)
        .y(bounds.height / 2);
    }
    // TODO: make a custom force to resist labels overlapping each other
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;
