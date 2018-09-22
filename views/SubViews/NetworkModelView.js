/* globals mure, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

const NODE_SIZE = 30;
const CURVE_OFFSET = NODE_SIZE * 4;

const OBJECT_PATHS = {
  // Diamond for generic classes
  'Generic': `\
M0,${-NODE_SIZE}\
L${NODE_SIZE},0\
L0,${NODE_SIZE}\
L${-NODE_SIZE},0\
Z`,
  // Circle for node classes
  'Node': `\
M0,${-NODE_SIZE}\
A${NODE_SIZE},${NODE_SIZE},0,1,1,0,${NODE_SIZE}\
A${NODE_SIZE},${NODE_SIZE},0,1,1,0,${-NODE_SIZE}`,
  // No object path for edge classes; these are only represented
  // in the lines layer
  'Edge': ''
};

const HANDLE_SIZE = 10;
const HANDLE_PATHS = {
  // Arrow for directed handles
  'directed': `\
M${-HANDLE_SIZE},${-HANDLE_SIZE}\
L${HANDLE_SIZE},0\
L${-HANDLE_SIZE},${HANDLE_SIZE}\
Z`,
  // Circle for undirected handles
  'undirected': `\
M0,${-HANDLE_SIZE}\
A${HANDLE_SIZE},${HANDLE_SIZE},0,1,1,0,${HANDLE_SIZE}\
A${HANDLE_SIZE},${HANDLE_SIZE},0,1,1,0,${-HANDLE_SIZE}
`
};

const DEFAULT_FORCES = {
  link: d3.forceLink(),
  charge: d3.forceManyBody(),
  center: d3.forceCenter(),
  collide: d3.forceCollide().radius(2 * NODE_SIZE)
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

    this.draggingConnection = null;
    this.handleTarget = null;

    this.simulation = d3.forceSimulation();
    for (const [forceName, force] of Object.entries(DEFAULT_FORCES)) {
      this.simulation.force(forceName, force);
    }

    this.lineLayer = this.content.append('g').classed('lineLayer', true);
    this.objectLayer = this.content.append('g').classed('objectLayer', true);
    this.handleLayer = this.content.append('g').classed('handleLayer', true);

    this.simulation.on('tick', () => {
      // We do some funkiness to the data object to help us draw:
      // drawObjectLayer updates labelWidth, and inititializes node.handlePositions
      this.drawObjectLayer();
      // drawLineLayer uses labelWidth, and updates node.handlePositions
      this.drawLineLayer();
      // drawHandleLayer uses node.handlePositions
      this.drawHandleLayer();
    });

    this.container.on('resize', () => {
      this.simulation.alpha(0.3);
    });
  }

  drawObjectLayer () {
    // Object groups
    let objects = this.objectLayer.selectAll('.object')
      .data(window.mainView.networkModelGraph.nodes, d => d.classId);
    objects.exit().remove();
    const objectsEnter = objects.enter().append('g');
    objects = objects.merge(objectsEnter);

    // Initialize handlePositions
    objects.each(d => {
      d.handlePositions = {};
    });

    // Manually patch the class on (so we can just use classObj.type),
    // and set each group's position
    objects.attr('class', d => `${d.type} object`)
      .attr('transform', d => {
        if (d.x === undefined || d.y === undefined) {
          return '';
        } else {
          return `translate(${d.x},${d.y})`;
        }
      });

    // Dragging behavior (disabled when handles are being dragged)
    objects.call(d3.drag()
      .on('start', d => {
        // disable link, charge, and center forces (keep collision)
        this.simulation.force('link', null);
        this.simulation.force('charge', null);
        // this.simulation.force('center', null);
        if (!d3.event.active && !this.draggingConnection) {
          this.simulation.alpha(0.1).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
      }).on('drag', d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }).on('end', d => {
        // re-enable link, charge, and center forces
        this.simulation.force('link', DEFAULT_FORCES.link);
        this.simulation.force('charge', DEFAULT_FORCES.charge);
        // this.simulation.force('center', DEFAULT_FORCES.center);
        if (!d3.event.active) {
          this.simulation.alpha(0);
        }
        delete d.fx;
        delete d.fy;
      }));
    // When dragging handles, register objects as targets
    const self = this;
    objects.on('mouseenter', function (d) {
      if (self.draggingConnection) {
        self.handleTarget = d.classId;
        d3.select(this).classed('targeted', true);
      }
    }).on('mouseleave', function (d) {
      if (self.draggingConnection) {
        self.handleTarget = null;
        d3.select(this).classed('targeted', false);
      }
    });

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
      d => `translate(0,${d.type === 'Edge' ? 3 / 2 * this.emSize : NODE_SIZE + this.emSize})`);
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
      .attr('y', d => d.type === 'Edge' ? -this.emSize : -this.emSize / 2);
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

  drawLineLayer () {
    // Lines associated with edge classes
    const edgeClasses = window.mainView.networkModelGraph.nodes
      .filter(d => d.type === 'Edge');
    let edgeLines = this.lineLayer.selectAll('.edge')
      .data(edgeClasses, d => d.classId);
    edgeLines.exit().remove();
    const edgeLinesEnter = edgeLines.enter().append('path')
      .classed('edge', true);
    edgeLines = edgeLines.merge(edgeLinesEnter);

    edgeLines.attr('d', d => {
      if (d.x === undefined || d.y === undefined) {
        return '';
      } else {
        // Round up to avoid gaps in the path
        const offset = Math.ceil(d.labelWidth / 2);
        return `\
M${d.x - offset - this.emSize},${d.y + this.emSize / 3}\
L${d.x + offset + this.emSize},${d.y + this.emSize / 3}`;
      }
    });

    // Lines between edge classes and node classes
    let connectionLines = this.lineLayer.selectAll('.connection')
      .data(window.mainView.networkModelGraph.edges, d => d.id);
    connectionLines.exit().remove();
    const connectionLinesEnter = connectionLines.enter().append('path')
      .classed('connection', true);
    connectionLines = connectionLines.merge(connectionLinesEnter);

    connectionLines.classed('targeted', d => d.id === this.draggingConnection);

    // Compute the path (and the handle positions along the way)
    connectionLines.attr('d', d => {
      if (d.source.x === undefined || d.source.y === undefined ||
          d.target.x === undefined || d.target.y === undefined) {
        return '';
      } else if (d.source.type === 'Node') {
        // Round down to avoid gaps in the path
        const offset = Math.floor(d.target.labelWidth / 2) + this.emSize;
        // Compute handle and curve anchor point positions
        d.source.handlePositions[d.id] = d.source.handlePositions[d.id] || {};
        const curveX = d.target.x - offset - CURVE_OFFSET;
        const curveY = d.target.y + this.emSize / 3;
        const theta = Math.atan2(curveY - d.source.y, curveX - d.source.x);
        const x = d.source.x + NODE_SIZE * Math.cos(theta) +
          (d.source.handlePositions[d.id].dx || 0);
        const y = d.source.y + NODE_SIZE * Math.sin(theta) +
          (d.source.handlePositions[d.id].dy || 0);
        // Update the node's outgoing handlePositions
        Object.assign(d.source.handlePositions[d.id], {
          connectionId: d.id,
          edgeClassId: d.target.classId,
          theta,
          x,
          y
        });
        // Return the arc
        return `M${x},${y}Q${curveX},${curveY},${d.target.x - offset},${curveY}`;
      } else {
        // Round down to avoid gaps in the path
        const offset = Math.floor(d.source.labelWidth / 2) + this.emSize;
        // Compute handle and curve anchor point positions
        d.target.handlePositions[d.id] = d.target.handlePositions[d.id] || {};
        const curveX = d.source.x + offset + CURVE_OFFSET;
        const curveY = d.source.y + this.emSize / 3;
        const theta = Math.atan2(curveY - d.target.y, curveX - d.target.x);
        const x = d.target.x + NODE_SIZE * Math.cos(theta) +
          (d.target.handlePositions[d.id].dx || 0);
        const y = d.target.y + NODE_SIZE * Math.sin(theta) +
          (d.target.handlePositions[d.id].dy || 0);
        // Update the node's incoming handlePositions
        Object.assign(d.target.handlePositions[d.id], {
          connectionId: d.id,
          edgeClassId: d.source.classId,
          incoming: true,
          theta,
          x,
          y
        });
        // Return the arc
        return `M${d.source.x + offset},${curveY}Q${curveX},${curveY},${x},${y}`;
      }
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

    // Draw the handles
    let handles = handleGroups.selectAll('.handle')
      .data(d => {
        if (d.type === 'Node') {
          return Object.values(d.handlePositions);
        } else if (d.type === 'Edge' && d.x !== undefined && d.y !== undefined) {
          return [
            {
              nodeClassId: d.sourceClassId,
              theta: 0,
              x: d.x - d.labelWidth / 2 - this.emSize,
              y: d.y + this.emSize / 3
            },
            {
              nodeClassId: d.targetClassId,
              theta: 0,
              x: d.x + d.labelWidth / 2 + this.emSize,
              y: d.y + this.emSize / 3
            }
          ];
        } else {
          return [];
        }
      }, d => d.edgeClassId);
    handles.exit().remove();
    const handlesEnter = handles.enter().append('g')
      .classed('handle', true);
    handles = handles.merge(handlesEnter);

    // Handle halo (to ensure CSS rules don't flicker as we drag)
    handlesEnter.append('circle')
      .classed('halo', true)
      .attr('r', HANDLE_SIZE + 3);
    handles.select('.halo')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    // Handle anchors
    handlesEnter.append('path')
      .classed('anchor', true);
    handles.select('.anchor')
      .attr('transform', d => {
        let angle = 180 * d.theta / Math.PI;
        if (d.incoming) {
          angle += 180;
        }
        return `translate(${d.x},${d.y}) rotate(${angle})`;
      })
      .attr('d', HANDLE_PATHS.directed);

    // Dragging behavior
    handles.call(d3.drag().on('start', d => {
      if (!this.draggingConnection) { // allow at most one handle drag in a multi-touch environment
        this.draggingConnection = d.connectionId;
        this.handleTarget = null;
        this.simulation.alpha(0);
        d.x0 = d3.event.x;
        d.y0 = d3.event.y;
      }
    }).on('drag', d => {
      d.dx = d3.event.x - d.x0;
      d.dy = d3.event.y - d.y0;
      this.drawLineLayer();
      this.drawHandleLayer();
    }).on('end', d => {
      this.draggingConnection = null;
      delete d.x0;
      delete d.dx;
      delete d.y0;
      delete d.dy;
      // console.log(this.handleTarget);
      this.handleTarget = null;
      this.simulation.alpha(0).restart();
    }));

    // While dragging handles, we want to ignore pointer events manually
    // (the :active selector doesn't seem to work as well while dragging)
    this.handleLayer.style('pointer-events', this.draggingConnection ? 'none' : null);
    // Similarly, cursor changes mostly get ignored while dragging, so we
    // need to apply the hidden cursor everywhere
    this.content.classed('hideCursor', !!this.draggingConnection);
  }

  draw () {
    const bounds = this.getContentBounds(this.content);

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
