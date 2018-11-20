/* globals origraph, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';
import ConnectModal from '../Modals/ConnectModal.js';

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

function bbox (alpha) {
  for (const node of bbox.nodes) {
    if (node.x <= NODE_SIZE) {
      node.vx += bbox.strength * alpha;
    } else if (node.x >= bbox.bounds.width - NODE_SIZE) {
      node.vx -= bbox.strength * alpha;
    }
    if (node.y <= NODE_SIZE) {
      node.vy += bbox.strength * alpha;
    } else if (node.y >= bbox.bounds.height - NODE_SIZE) {
      node.vy -= bbox.strength * alpha;
    }
  }
}
bbox.nodes = [];
bbox.bounds = {
  width: 1,
  height: 1
};
bbox.strength = 15;
bbox.initialize = nodes => {
  bbox.nodes = nodes;
};

function keepFixed (alpha) {
  for (const node of keepFixed.nodes) {
    if (node.fx !== undefined) {
      node.x = node.fx;
      node.vx = 0;
    }
    if (node.fy !== undefined) {
      node.y = node.fy;
      node.vy = 0;
    }
  }
}
keepFixed.nodes = [];

const DEFAULT_FORCES = {
  link: d3.forceLink(),
  center: d3.forceCenter(),
  collide: d3.forceCollide().radius(NODE_SIZE),
  bbox,
  keepFixed
};

class Handle {
  constructor (connection) {
    this.connection = connection;
  }

  get otherHandle () {
    if (!this.connection.source.handles) {
      return undefined;
    }
    const sourceHandle = this.connection.source.handles[this.connection.id];
    if (this === sourceHandle) {
      return this.connection.target.handles &&
        this.connection.target.handles[this.connection.id];
    } else {
      return sourceHandle;
    }
  }

  get classObj () {
    if (this.connection.source.handles &&
      this === this.connection.source.handles[this.connection.id]) {
      // this is the source handle; return the source class
      return this.connection.source.classObj;
    } else if (this.connection.target.dummy) {
      // this is a target handle, but for a dummy connection that will not have
      // an associated class, so still return the source class
      return this.connection.source.classObj;
    } else {
      // this is the target handle
      return this.connection.target.classObj;
    }
  }
}

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
    return Object.keys(origraph.currentModel.classes).length === 0;
  }
  setup () {
    super.setup();

    this.draggingHandle = null;
    this.handleTarget = null;

    this.simulation = d3.forceSimulation();
    for (const [forceName, force] of Object.entries(DEFAULT_FORCES)) {
      this.simulation.force(forceName, force);
    }

    this.lineLayer = this.content.append('g').classed('lineLayer', true);
    this.objectLayer = this.content.append('g').classed('objectLayer', true);
    this.handleLayer = this.content.append('g').classed('handleLayer', true);

    this.simulation.on('tick', () => {
      this.tick();
    });

    this.container.on('resize', () => {
      this.simulation.alpha(0.3);
    });
  }

  draw () {
    super.draw();
    const bounds = this.getContentBounds(this.content);
    if (this.simulation.force('center')) {
      this.simulation.force('center')
        .x(bounds.width / 2)
        .y(bounds.height / 2);
    }
    if (this.simulation.force('bbox')) {
      this.simulation.force('bbox').bounds = bounds;
    }

    // Assign initial positions to nodes that don't have any
    for (const node of window.mainView.networkModelGraph.nodes) {
      if (node.x === undefined || node.y === undefined) {
        node.x = Math.random() * bounds.width;
        node.y = Math.random() * bounds.height;
      }
    }
    this.simulation.nodes(window.mainView.networkModelGraph.nodes);

    if (this.simulation.force('link')) {
      this.simulation.force('link')
        .links(window.mainView.networkModelGraph.edges);
    }

    // Force a redraw whether or not the simulation is running
    this.tick();
  }

  tick () {
    // We do some funkiness to the data object to help us draw:
    // drawObjectLayer updates labelWidth, and inititializes node.handles
    this.drawObjectLayer();
    // drawLineLayer uses labelWidth, and updates node.handles
    this.drawLineLayer();
    // drawHandleLayer uses node.handles
    this.drawHandleLayer();
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

    // Initialize handles, and positions if they're not defined
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
        // disable link and center forces (keep bbox and collision)
        // this.simulation.force('link', null);
        // this.simulation.force('center', null);
        if (!d3.event.active && !this.draggingHandle) {
          this.simulation.alpha(0.1).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
        // Activate the corresponding table
        window.mainView.subViews[d.classObj.classId + 'TableView'].raise();
      }).on('drag', d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }).on('end', d => {
        // re-enable link and center forces
        // this.simulation.force('link', DEFAULT_FORCES.link);
        // this.simulation.force('center', DEFAULT_FORCES.center);
        if (!d3.event.active) {
          this.simulation.alpha(0);
        }
      }));
    // When dragging handles, determine if the connection is valid, and if so,
    // register this.handleTarget
    objects.on('mouseenter', function (d) {
      if (self.draggingHandle) {
        const otherHandle = self.draggingHandle.otherHandle;
        const cantConnect = d.classObj.type === 'Edge' &&
          otherHandle && otherHandle.classObj.type === 'Edge';
        if (cantConnect) {
          self.handleTarget = null;
        } else {
          self.handleTarget = d;
        }
        d3.select(this).classed('connecting', !cantConnect);
        d3.select(this).classed('cantConnect', cantConnect);
      }
    }).on('mouseleave', function (d) {
      if (self.draggingHandle) {
        self.handleTarget = null;
        d3.select(this).classed('connecting', false);
        d3.select(this).classed('cantConnect', false);
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
      d.labelWidth = bounds.right - bounds.left;
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
          const x0 = -offset - this.emSize;
          const x1 = offset + this.emSize;
          const y0 = 0.75 * this.emSize;
          const y1 = 1.25 * this.emSize;
          return `M${x0},${y0}L${x1},${y0}L${x1},${y1}L${x0},${y1}Z`;
        }
      } else {
        return OBJECT_PATHS[d.classObj.type];
      }
    }).attr('fill', d => '#' + (d.classObj.annotations.color || 'BDBDBD'));

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
      // .style('filter', d => `url(#recolorImageTo${d.classObj.annotations.color})`)
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
    if (this.isDragging(connection)) {
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
    if (this.isDragging(connection)) {
      if (this.draggingHandle.isEdgeHandle) {
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

  updateNodeDummyHandles (dummyNodeConnections) {
    for (const connection of dummyNodeConnections) {
      const handle = this.getOrInitSourceHandle(connection);
      handle.connection = connection;
      // Figure out the largest gaps between existing handles
      const angles = [];
      for (const otherHandle of Object.values(connection.source.handles)) {
        if (otherHandle.theta !== undefined && handle !== otherHandle &&
            otherHandle !== this.draggingHandle) {
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
      if (this.isDragging(connection)) {
        // We're dragging the handle; pop the curve out a bit from the node
        let curveRadius = NODE_SIZE + CURVE_OFFSET;
        let curveTheta = handle.theta;
        if (this.handleTarget && this.handleTarget.classObj === connection.source.classObj) {
          // Creating a self-edge; rotate the curve to between the arc start
          // and the handle's current location

          // Normalize curveTheta to [-π, π]
          while (curveTheta > Math.PI) { curveTheta -= 2 * Math.PI; }
          while (curveTheta < -Math.PI) { curveTheta += 2 * Math.PI; }
          const handleTheta = Math.atan2(handle.y - connection.source.y,
            handle.x - connection.source.x);
          if (handleTheta > curveTheta) {
            curveTheta += (handleTheta - curveTheta) / 2;
          } else {
            curveTheta -= (curveTheta - handleTheta) / 2;
          }
        }
        connection.curveX = connection.source.x + curveRadius * Math.cos(curveTheta);
        connection.curveY = connection.source.y + curveRadius * Math.sin(curveTheta);
        handle.pointTheta = Math.atan2(handle.y - connection.curveY, handle.x - connection.curveX);
      }
    }
  }

  getOrInitSourceHandle (connection) {
    connection.source.handles[connection.id] =
      connection.source.handles[connection.id] || new Handle(connection);
    return connection.source.handles[connection.id];
  }
  getOrInitTargetHandle (connection) {
    connection.target.handles[connection.id] =
      connection.target.handles[connection.id] || new Handle(connection);
    return connection.target.handles[connection.id];
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

    const dummyNodeConnections = [];
    if (connection.dummy) {
      // Dummy connections; these should only have one handle
      if (connection.location === 'node') {
        // Arrange dummy nodes later, when we already know all the nodes'
        // other handle positions
        dummyNodeConnections.push(connection);
      } else if (connection.location === 'source') {
        // Incoming dummy to edge
        options.offsetDirection = -1;
        options.edgeX = connection.target.x;
        options.edgeY = connection.target.y;
        options.handle = this.getOrInitTargetHandle(connection);
        this.updateEdgeDummyHandle(options);
      } else if (connection.location === 'target') {
        // Outgoing dummy from edge
        options.offsetDirection = 1;
        options.edgeX = connection.source.x;
        options.edgeY = connection.source.y;
        options.handle = this.getOrInitSourceHandle(connection);
        this.updateEdgeDummyHandle(options);
      }
    } else {
      // Regular connections; these should have two handles
      if (connection.location === 'source') {
        // Connection from node to edge
        options.nodeHandle = this.getOrInitSourceHandle(connection);
        options.edgeHandle = this.getOrInitTargetHandle(connection);
        options.nodeX = connection.source.x;
        options.nodeY = connection.source.y;
        options.edgeX = connection.target.x;
        options.edgeY = connection.target.y;
        options.offsetDirection = -1;
        this.updateBothHandles(options);
      } else if (connection.location === 'target') {
        // Connection from edge to node
        options.nodeHandle = this.getOrInitTargetHandle(connection);
        options.edgeHandle = this.getOrInitSourceHandle(connection);
        options.nodeX = connection.target.x;
        options.nodeY = connection.target.y;
        options.edgeX = connection.source.x;
        options.edgeY = connection.source.y;
        options.offsetDirection = 1;
        this.updateBothHandles(options);
      }
    }
    return dummyNodeConnections;
  }

  drawLineLayer () {
    // Compute handle and curve anchor points for everything except dummy
    // node connections
    const dummyNodeConnections = window.mainView.networkModelGraph.edges
      .reduce((agg, d) => {
        return agg.concat(this.updateHandlesAndAnchors(d));
      }, []);
    // Second pass for dummy node handles
    this.updateNodeDummyHandles(dummyNodeConnections);

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
    connectionLines.classed('dragging', d => this.isDragging(d))
      .classed('connecting', d => this.isDragging(d) && this.handleTarget !== null)
      .classed('disconnecting', d => this.isDragging(d) && this.handleTarget === null);
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
        if (this.isDragging(d.connection) && this.handleTarget === null) {
          return HANDLE_PATHS.disconnect;
        } else if (d.connection.directed) {
          return HANDLE_PATHS.directed;
        } else {
          return HANDLE_PATHS.undirected;
        }
      }).classed('dragging', d => this.isDragging(d.connection))
      .classed('connecting', d => this.isDragging(d.connection) && this.handleTarget !== null)
      .classed('disconnecting', d => this.isDragging(d.connection) && this.handleTarget === null);

    // Dragging behavior
    handles.call(d3.drag().on('start', d => {
      this.draggingHandle = d;
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
      this.draggingHandle = null;
      delete d.x0;
      delete d.dx;
      delete d.y0;
      delete d.dy;
      this.connectOrDisconnect(d);
      this.handleTarget = null;
      this.simulation.alpha(0).restart();
    }));

    // While dragging handles, we want to ignore pointer events manually
    // (the :active selector doesn't seem to work as well while dragging)
    this.handleLayer.style('pointer-events', this.draggingHandle ? 'none' : null);
    // Similarly, cursor changes mostly get ignored while dragging, so we
    // need to apply the hidden cursor everywhere
    this.content.classed('hideCursor', !!this.draggingHandle);
  }

  isDragging (connection) {
    return this.draggingHandle && connection.id === this.draggingHandle.connection.id;
  }
  connectOrDisconnect (handle) {
    if (this.handleTarget === null) {
      // Disconnect
      if (!handle.connection.dummy) { // dummy handles are already disconnected
        const edgeClass = handle.isEdgeHandle ? handle.classObj : handle.otherHandle.classObj;
        if (handle.connection.location === 'source') {
          edgeClass.disconnectSource();
        } else {
          edgeClass.disconnectTarget();
        }
      }
    } else {
      // Connect
      const options = {};
      if (handle.connection.location === 'node') {
        if (this.handleTarget.classObj.type === 'Edge') {
          // Node dummy to Edge (need to auto-determine which handle)
          options.nodeClass = handle.classObj;
          options.edgeClass = this.handleTarget.classObj;
          // If just one handle is hanging, connect to it
          if (options.edgeClass.sourceClassId && options.edgeClass.targetClassId === null) {
            options.side = 'target';
            options.sourceClass = options.edgeClass;
            options.targetClass = options.nodeClass;
          } else if (options.edgeClass.sourceClassId === null && options.edgeClass.targetClassId) {
            options.side = 'source';
            options.sourceClass = options.nodeClass;
            options.targetClass = options.edgeClass;
          } else {
            // Otherwise (both or neither connected), pick the one that was
            // physically closest when the mouse was released
            if (handle.x <= this.handleTarget.x) {
              options.side = 'source';
              options.sourceClass = options.nodeClass;
              options.targetClass = options.edgeClass;
            } else {
              options.side = 'target';
              options.sourceClass = options.edgeClass;
              options.targetClass = options.nodeClass;
            }
          }
        } else {
          // Node dummy to Node
          options.sourceClass = options.nodeClass = handle.classObj;
          options.targetClass = options.otherNodeClass = this.handleTarget.classObj;
          // Don't need to assign direction for node-node connections
        }
      } else if (handle.connection.location === 'source') {
        const classObj = handle.connection.dummy ? handle.classObj : handle.otherHandle.classObj;
        const otherHandle = handle.otherHandle;
        if (handle.connection.dummy || otherHandle.isEdgeHandle) {
          // Edge (source handle) to Node
          options.sourceClass = options.nodeClass = this.handleTarget.classObj;
          options.targetClass = options.edgeClass = classObj;
          options.side = 'source';
        } else {
          // Node to Edge (source handle)
          options.sourceClass = options.nodeClass = classObj;
          options.targetClass = options.edgeClass = this.handleTarget.classObj;
          options.side = 'source';
        }
      } else {
        const classObj = handle.connection.dummy ? handle.classObj : handle.otherHandle.classObj;
        const otherHandle = handle.otherHandle;
        if (handle.connection.dummy || otherHandle.isEdgeHandle) {
          // Edge (target handle) to Node
          options.sourceClass = options.edgeClass = classObj;
          options.targetClass = options.nodeClass = this.handleTarget.classObj;
          options.side = 'target';
        } else {
          // Node to Edge (target handle)
          options.sourceClass = options.edgeClass = this.handleTarget.classObj;
          options.targetClass = options.nodeClass = classObj;
          options.side = 'target';
        }
      }
      window.mainView.showOverlay(new ConnectModal(options));
    }
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;
