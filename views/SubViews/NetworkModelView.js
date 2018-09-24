/* globals mure, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import ZoomableSvgViewMixin from './ZoomableSvgViewMixin.js';

const NODE_SIZE = 30;
const CURVE_OFFSET = NODE_SIZE * 2;

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
A${NODE_SIZE},${NODE_SIZE},0,1,1,0,${-NODE_SIZE}`
  // Edge shapes are just lines, dynamically determined in drawObjectLayer()
};

const HANDLE_SIZE = 7;
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
`,
  // X for disconnecting handles
  'disconnect': `\
M0,${-HANDLE_SIZE / 2}\
L${HANDLE_SIZE / 2},${-HANDLE_SIZE}\
L${HANDLE_SIZE},${-HANDLE_SIZE / 2}\
L${HANDLE_SIZE / 2},0\
L${HANDLE_SIZE},${HANDLE_SIZE / 2}\
L${HANDLE_SIZE / 2},${HANDLE_SIZE}\
L0,${HANDLE_SIZE / 2}\
L${-HANDLE_SIZE / 2},${HANDLE_SIZE}\
L${-HANDLE_SIZE},${HANDLE_SIZE / 2}\
L${-HANDLE_SIZE / 2},0\
L${-HANDLE_SIZE},${-HANDLE_SIZE / 2}\
L${-HANDLE_SIZE / 2},${-HANDLE_SIZE}\
Z`
};

const DEFAULT_FORCES = {
  link: d3.forceLink(),
  charge: d3.forceManyBody(),
  center: d3.forceCenter(),
  collide: d3.forceCollide().radius(2 * NODE_SIZE)
};

class NetworkModelView extends ZoomableSvgViewMixin(GoldenLayoutView) {
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
      // drawObjectLayer updates labelWidth, and inititializes node.handles
      this.drawObjectLayer();
      // drawLineLayer uses labelWidth, and updates node.handles
      this.drawLineLayer();
      // drawHandleLayer uses node.handles
      this.drawHandleLayer();
    });

    this.container.on('resize', () => {
      this.simulation.alpha(0.3);
    });
  }

  drawObjectLayer () {
    const self = this;

    // Only need to create object layer groups for non-dummy nodes
    const nodes = window.mainView.networkModelGraph.nodes.filter(d => !!d.classObj);

    // Object groups
    let objects = this.objectLayer.selectAll('.object')
      .data(nodes, d => d.classObj.classId);
    objects.exit().remove();
    const objectsEnter = objects.enter().append('g');
    objects = objects.merge(objectsEnter);

    // Initialize handles
    objects.each(d => {
      d.handles = {};
    });

    // Manually patch the class on based on type and set each group's position
    objects.attr('class', d => `${d.classObj.type} object`)
      .attr('transform', d => {
        if (d.x === undefined || d.y === undefined) {
          return '';
        } else {
          return `translate(${d.x},${d.y})`;
        }
      });

    // Class dragging behavior (disabled when handles are being dragged)
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
    objects.on('mouseenter', function (d) {
      if (self.draggingConnection) {
        self.handleTarget = d.classObj.classId;
        d3.select(this).classed('connecting', true);
      }
    }).on('mouseleave', function (d) {
      if (self.draggingConnection) {
        self.handleTarget = null;
        d3.select(this).classed('connecting', false);
      }
    });

    // Add the diamond, circle, or line (updated after labelWidth is calculated)
    objectsEnter.append('path').classed('objectShape', true);

    // Label (on top of the shape)
    const textGroupEnter = objectsEnter.append('g').classed('textGroup', true);
    textGroupEnter.append('rect'); // background
    textGroupEnter.append('text');
    objects.select('.textGroup').attr('transform',
      d => `translate(0,${d.classObj.type === 'Edge' ? 2.5 * this.emSize : NODE_SIZE + this.emSize})`);
    objects.select('text').text(d => d.classObj.className);
    // Patch labelWidth onto the data, so it's available elsewhere
    objects.each(function (d) {
      const bounds = this.querySelector('text').getBoundingClientRect();
      const left = self.currentZoom.invertX(bounds.left);
      const right = self.currentZoom.invertX(bounds.right);
      d.labelWidth = right - left;
    });
    // Size the label background
    objects.select('.textGroup rect')
      .attr('x', d => -d.labelWidth / 2)
      .attr('y', -this.emSize)
      .attr('width', d => d.labelWidth)
      .attr('height', this.emSize);

    // Now that we know labelWidth, apply the diamond, circle, or line shape
    objects.select('.objectShape').attr('d', d => {
      if (d.classObj.type === 'Edge') {
        if (d.x === undefined || d.y === undefined) {
          return '';
        } else {
          // Round the offset up to avoid gaps with connection paths
          const offset = Math.ceil(d.labelWidth / 2);
          return `\
M${-offset - this.emSize},${this.emSize}\
L${offset + this.emSize},${this.emSize}`;
        }
      } else {
        return OBJECT_PATHS[d.classObj.type];
      }
    });

    // Icons
    const iconGroupEnter = objectsEnter.append('g').classed('icons', true);
    iconGroupEnter.append('image').classed('typeIcon', true);
    iconGroupEnter.append('image').classed('menuIcon', true)
      .attr('xlink:href', `img/hamburger.svg`);
    objectsEnter.selectAll('.icons image')
      .attr('width', this.emSize)
      .attr('height', this.emSize)
      .attr('y', -this.emSize / 2);
    objects.select('.typeIcon')
      .attr('xlink:href', d => `img/${d.classObj.type.toLowerCase()}.svg`)
      .attr('x', d => d.classObj.type === 'Edge' ? d.labelWidth / 2 - 2 * this.emSize : -this.emSize);
    objects.select('.menuIcon')
      .attr('x', d => d.classObj.type === 'Edge' ? d.labelWidth / 2 - this.emSize : 0)
      .on('click', function (d) {
        window.mainView.showClassContextMenu({
          classId: d.classObj.classId,
          targetBounds: this.getBoundingClientRect()
        });
      });
  }

  updateEdgeDummyHandle ({
    connection,
    handle,
    offsetDirection,
    edgeX,
    edgeY,
    xEdgeOffset,
    yEdgeOffset
  }) {
    handle.connection = connection;
    handle.isEdgeHandle = true;
    handle.x = connection.x0 = edgeX + offsetDirection * xEdgeOffset;
    handle.y = connection.y0 = edgeY + yEdgeOffset;
    connection.x1 = handle.x = handle.x + (handle.dx || 0);
    connection.y1 = handle.y = handle.y + (handle.dy || 0);
    connection.curveY = connection.y0;
    if (connection.id === this.draggingConnection) {
      connection.curveX = connection.x0 + offsetDirection * CURVE_OFFSET;
      handle.pointTheta = handle.theta =
        Math.atan2(handle.y - connection.curveY, handle.x - connection.curveX);
      // The incoming handle should point inward
      if (offsetDirection === -1) {
        handle.pointTheta += Math.PI;
      }
    } else {
      connection.curveX = connection.x0;
      handle.pointTheta = handle.theta = 0;
    }
  }

  updateBothHandles ({
    connection,
    nodeHandle,
    edgeHandle,
    offsetDirection,
    edgeX,
    edgeY,
    nodeX,
    nodeY,
    xEdgeOffset,
    yEdgeOffset
  }) {
    nodeHandle.connection = connection;
    nodeHandle.isEdgeHandle = false;
    edgeHandle.connection = connection;
    edgeHandle.isEdgeHandle = true;
    // First assume that there's no dragging going on (for both
    // calculations later, we need to know where the node handle *would* be)
    edgeHandle.x = connection.x1 = edgeX + offsetDirection * xEdgeOffset;
    edgeHandle.y = connection.y1 = edgeY + yEdgeOffset;
    connection.curveX = connection.x1 + offsetDirection * CURVE_OFFSET;
    connection.curveY = connection.y1;
    edgeHandle.pointTheta = edgeHandle.theta = 0;
    nodeHandle.pointTheta = nodeHandle.theta = Math.atan2(connection.curveY - nodeY, connection.curveX - nodeX);
    if (offsetDirection === 1) {
      // The incoming handle should point inward
      nodeHandle.pointTheta += Math.PI;
    }
    nodeHandle.x = connection.x0 = nodeX + NODE_SIZE * Math.cos(nodeHandle.theta);
    nodeHandle.y = connection.y0 = nodeY + NODE_SIZE * Math.sin(nodeHandle.theta);
    // Okay, if dragging is happening, update some things:
    if (connection.id === this.draggingConnection) {
      if (this.isDraggingEdgeHandle) {
        edgeHandle.x = connection.x1 = edgeHandle.x + (edgeHandle.dx || 0);
        edgeHandle.y = connection.y1 = edgeHandle.y + (edgeHandle.dy || 0);
        // We're dragging the edge, so curve relative to the node instead
        connection.curveX = connection.x0 + CURVE_OFFSET * Math.cos(nodeHandle.theta);
        connection.curveY = connection.y0 + CURVE_OFFSET * Math.sin(nodeHandle.theta);
        edgeHandle.pointTheta = edgeHandle.theta = Math.atan2(connection.curveY - edgeHandle.y, connection.curveX - edgeHandle.x);
        if (offsetDirection === -1) {
          // The outgoing handle should point outward
          edgeHandle.pointTheta += Math.PI;
        }
      } else {
        nodeHandle.x = connection.x0 = nodeHandle.x + (nodeHandle.dx || 0);
        nodeHandle.y = connection.y0 = nodeHandle.y + (nodeHandle.dy || 0);
        nodeHandle.pointTheta = nodeHandle.theta = Math.atan2(connection.curveY - nodeHandle.y, connection.curveX - nodeHandle.x);
        if (offsetDirection === 1) {
          // The incoming handle should point inward
          nodeHandle.pointTheta += Math.PI;
        }
      }
    }
  }

  updateNodeDummyHandles (dummyNodes) {
    for (const connection of dummyNodes) {
      const handle = connection.source.handles[connection.id] =
        connection.source.handles[connection.id] || {};
      handle.connection = connection;
      // Figure out the largest gaps between existing handles
      const angles = [];
      for (const otherHandle of Object.values(connection.source.handles)) {
        const isDraggingHandle = otherHandle.connection.id === this.draggingConnection &&
          !this.isDraggingEdgeHandle;
        if (otherHandle.theta !== undefined && handle !== otherHandle && !isDraggingHandle) {
          angles.push(otherHandle.theta);
        }
      }
      let gaps = angles.sort().map((theta1, index) => {
        const theta0 = index === 0
          ? angles[angles.length - 1] - 2 * Math.PI : angles[index - 1];
        return { theta1, theta0, angle: theta1 - theta0 };
      }).sort((a, b) => b.angle - a.angle);
      if (gaps.length === 0) {
        // When the dummy handle is the only one, angle it to π / 4
        gaps.push({
          theta1: (5 / 4) * Math.PI,
          theta0: -(3 / 4) * Math.PI,
          angle: 2 * Math.PI
        });
      }
      // Split the biggest gap in half
      handle.pointTheta = handle.theta = gaps[0].theta0 + gaps[0].angle / 2;
      connection.x0 = connection.source.x + NODE_SIZE * Math.cos(handle.theta);
      connection.y0 = connection.source.y + NODE_SIZE * Math.sin(handle.theta);
      handle.x = connection.x1 = connection.x0 + (handle.dx || 0);
      handle.y = connection.y1 = connection.y0 + (handle.dy || 0);
      // By default, don't bother drawing the path (deleteing curveX and curveY
      // will suppress the path from being drawn)
      delete connection.curveX;
      delete connection.curveY;
      if (connection.id === this.draggingConnection) {
        // We're dragging the handle; pop the curve out a bit from the node
        const curveRadius = NODE_SIZE + CURVE_OFFSET;
        let curveTheta = handle.theta;
        if (this.handleTarget === connection.source.classId) {
          // Creating a self-edge; rotate the curve to between the arc start
          // and the handle's current location
          curveTheta = (handle.theta +
            Math.atan2(handle.y - connection.source.y,
              handle.x - connection.source.x)) / 2;
        }
        connection.curveX = connection.source.x + curveRadius * Math.cos(curveTheta);
        connection.curveY = connection.source.y + curveRadius * Math.sin(curveTheta);
        handle.pointTheta = Math.atan2(handle.y - connection.curveY, handle.x - connection.curveX);
      }
    }
  }

  updateHandlesAndAnchors (connection) {
    // Don't do anything if node positions haven't yet been initialized
    if (connection.source.x === undefined || connection.source.y === undefined ||
        connection.target.x === undefined || connection.target.y === undefined) {
      return [];
    }

    // Some initial computations that all the functions use; Math.floor avoids
    // gaps with the edge's objectShape
    const options = {
      connection,
      xEdgeOffset: connection.location === 'source'
        ? Math.floor(connection.target.labelWidth / 2) + this.emSize
        : connection.location === 'target'
          ? Math.floor(connection.source.labelWidth / 2) + this.emSize
          : 0,
      yEdgeOffset: this.emSize
    };

    const dummyNodes = [];
    if (connection.dummy) {
      // Dummy connections; these should only have one handle
      if (connection.location === 'node') {
        // Arrange dummy nodes later, when we already know all the nodes'
        // other handle positions
        dummyNodes.push(connection);
      } else if (connection.location === 'source') {
        // Incoming dummy to edge
        options.handle = connection.target.handles[connection.id] =
          connection.target.handles[connection.id] || {};
        options.offsetDirection = -1;
        options.edgeX = connection.target.x;
        options.edgeY = connection.target.y;
        this.updateEdgeDummyHandle(options);
      } else if (connection.location === 'target') {
        // Outgoing dummy from edge
        options.handle = connection.source.handles[connection.id] =
          connection.source.handles[connection.id] || {};
        options.offsetDirection = 1;
        options.edgeX = connection.source.x;
        options.edgeY = connection.source.y;
        this.updateEdgeDummyHandle(options);
      }
    } else {
      // Regular connections; these should have two handles
      if (connection.location === 'source') {
        // Connection from node to edge
        options.nodeHandle = connection.source.handles[connection.id] =
          connection.source.handles[connection.id] || {};
        options.edgeHandle = connection.target.handles[connection.id] =
          connection.target.handles[connection.id] || {};
        options.nodeX = connection.source.x;
        options.nodeY = connection.source.y;
        options.edgeX = connection.target.x;
        options.edgeY = connection.target.y;
        options.offsetDirection = -1;
        this.updateBothHandles(options);
      } else if (connection.location === 'target') {
        // Connection from edge to node
        options.nodeHandle = connection.target.handles[connection.id] =
          connection.target.handles[connection.id] || {};
        options.edgeHandle = connection.source.handles[connection.id] =
          connection.source.handles[connection.id] || {};
        options.nodeX = connection.target.x;
        options.nodeY = connection.target.y;
        options.edgeX = connection.source.x;
        options.edgeY = connection.source.y;
        options.offsetDirection = 1;
        this.updateBothHandles(options);
      }
    }
    return dummyNodes;
  }

  drawLineLayer () {
    // Compute handle and curve anchor points for everything except dummy
    // node connections
    const dummyNodes = window.mainView.networkModelGraph.edges
      .reduce((agg, d) => {
        return agg.concat(this.updateHandlesAndAnchors(d));
      }, []);
    // Second pass for dummy node handles
    this.updateNodeDummyHandles(dummyNodes);

    // A path for every connection
    let connectionLines = this.lineLayer.selectAll('.connection')
      .data(window.mainView.networkModelGraph.edges, d => d.id);
    connectionLines.exit().remove();
    const connectionLinesEnter = connectionLines.enter().append('path')
      .classed('connection', true);
    connectionLines = connectionLines.merge(connectionLinesEnter);

    // Path shapes
    connectionLines.attr('d', d => {
      if (d.x0 === undefined || d.y0 === undefined ||
          d.curveX === undefined || d.curveY === undefined ||
          d.x1 === undefined || d.y1 === undefined) {
        return '';
      } else {
        return `M${d.x0},${d.y0}Q${d.curveX},${d.curveY},${d.x1},${d.y1}`;
      }
    });

    // Apply relevant classes for styling
    connectionLines.classed('dragging', d => d.id === this.draggingConnection)
      .classed('connecting', d => d.id === this.draggingConnection &&
        this.handleTarget !== null)
      .classed('disconnecting', d => d.id === this.draggingConnection &&
        this.handleTarget === null);
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
      .data(d => Object.values(d.handles || {}),
        d => `${d.connection.id}${d.isEdgeHandle ? '_edge' : '_node'}`);
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
        let angle = 180 * d.pointTheta / Math.PI;
        return `translate(${d.x},${d.y}) rotate(${angle})`;
      })
      .attr('d', d => {
        if (this.draggingConnection === d.connection.id &&
            this.handleTarget === null) {
          return HANDLE_PATHS.disconnect;
        } else if (d.connection.directed) {
          return HANDLE_PATHS.directed;
        } else {
          return HANDLE_PATHS.undirected;
        }
      }).classed('dragging', d => this.draggingConnection === d.connection.id)
      .classed('connecting', d => this.handleTarget !== null &&
        this.draggingConnection === d.connection.id)
      .classed('disconnecting', d => this.handleTarget === null &&
        this.draggingConnection === d.connection.id);

    // Dragging behavior
    handles.call(d3.drag().on('start', d => {
      this.draggingConnection = d.connection.id;
      this.isDraggingEdgeHandle = d.isEdgeHandle;
      this.handleTarget = null;
      this.simulation.alpha(0);
      d.x0 = d3.event.x;
      d.y0 = d3.event.y;
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
      // TODO: connect or disconnect, based on this.handleTarget and
      // d.edgeClassId or d.nodeClassId
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
