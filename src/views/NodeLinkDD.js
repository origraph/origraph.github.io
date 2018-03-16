/* globals d3 */
import { View } from '../uki.es.js';

let DEBUG = true;

function createEnum (entries) {
  let temp = {};
  entries.forEach(entry => { temp[entry] = entry; });
  return Object.freeze(temp);
}

function getCirclePath (radius) {
  let cubicOffset = 5 * radius / 9;
  return `
M0,${-radius}
C${cubicOffset},${-radius},
${radius},${-cubicOffset},
${radius},0,
C${radius},${cubicOffset},
${cubicOffset},${radius},
0,${radius},
C${-cubicOffset},${radius},
${-radius},${cubicOffset},
${-radius},0,
C${-radius},${-cubicOffset},
${-cubicOffset},${-radius},
0,${-radius}
Z`;
}

let SPINNER_SIZE = {
  width: 550,
  height: 400
};

let NODE_RADIUS = 14;
let STANDARD_CIRCLE = getCirclePath(NODE_RADIUS);

let ARC_CURVE = d3.line().curve(d3.curveCatmullRom.alpha(1));
let SUPERNODE_CURVE = d3.line().curve(d3.curveCatmullRomClosed.alpha(1));

let EXTERNAL_INDEX = 0;

let GHOST_NODE_TYPES = createEnum([
  'CENTER',
  'JUNCTION',
  'EXTERNAL'
]);

let ENTITY_TYPES = createEnum([
  'NODE', // primitive values
  'SUPERNODE', // objects
  'EDGE' // reference or object containing references that has been flagged by the user as an edge
]);

class NodeLinkDD extends View {
  constructor (selection) {
    super();
    this.graph = undefined;
    let linkForce = d3.forceLink()
      .id(d => d.id);
    let manyBodyForce = d3.forceManyBody();
    this.simulation = d3.forceSimulation()
      .force('link', linkForce)
      .force('charge', manyBodyForce)
      .force('center', d3.forceCenter());
    this.setSelection(selection);
  }
  async setSelection (selection = null) {
    this.selection = selection;
    this.graph = undefined;
    if (this.d3el) {
      this.render(); // show the spinner before updating the graph
    }
    this.simulation.stop();
    await this.updateGraph();
    if (this.graph) {
      this.simulation.nodes(this.graph.ghostNodes);
      this.simulation.force('link')
        .links(this.graph.ghostEdges);
      this.simulation.restart();
    } else {
      this.simulation.nodes([]);
      this.simulation.force('link').links([]);
    }
  }
  setup (d3el) {
    if (d3el.select('#arcs').size() === 0) {
      d3el.append('g').attr('id', 'arcs');
    }
    if (d3el.select('#entities').size() === 0) {
      d3el.append('g').attr('id', 'entities');
    }
    if (DEBUG) {
      if (d3el.select('#ghostEdges').size() === 0) {
        d3el.append('g').attr('id', 'ghostEdges');
      }
      if (d3el.select('#ghostNodes').size() === 0) {
        d3el.append('g').attr('id', 'ghostNodes');
      }
    }
    if (d3el.select('#spinner').size() === 0) {
      d3el.append('image').attr('id', 'spinner')
        .attr('width', SPINNER_SIZE.width)
        .attr('height', SPINNER_SIZE.height)
        .attr('href', 'spinner.gif');
    }

    this.visualEntities = d3.select('#entities')
      .selectAll('.entity');
    this.visualArcs = d3.select('#arcs')
      .selectAll('.arc');

    this.simulation.on('tick', () => { this.simulationTick(d3el); });
  }
  draw (d3el) {
    let bounds = d3el.node().getBoundingClientRect();
    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);

    if (this.graph === undefined) {
      this.showSpinner(d3el, bounds);
    } else {
      this.hideSpinner(d3el);

      if (this.graph === null) {
        // TODO: show message saying that no graph is loaded
      } else {
        let transition = d3.transition().duration(200);

        this.drawEntities(d3el, transition);
        this.drawArcs(d3el, transition);
        if (DEBUG) {
          this.drawDebuggingLayers(d3el);
        }
      }
    }
  }
  drawEntities (d3el, transition) {
    this.visualEntities = d3el.select('#entities')
      .selectAll('.entity').data(this.graph.entities, d => d.id);
    this.visualEntities.exit()
      .transition(transition)
      .attr('opacity', 0)
      .remove();
    let enterEntities = this.visualEntities.enter()
      .append('g').classed('entity', true);
    this.visualEntities = this.visualEntities.merge(enterEntities);

    enterEntities.append('path')
      .classed('border', true)
      .attr('d', '');
    let self = this;
    this.visualEntities.each(function (d) {
      let el = d3.select(this);
      if (d.type === ENTITY_TYPES.NODE) {
        el.select('.border')
          .transition(transition)
          .attr('d', STANDARD_CIRCLE);
      } else if (d.type === ENTITY_TYPES.EDGE) {
        el.select('.border')
          .transition(transition)
          .attr('d', `
M0,${-NODE_RADIUS}
L${NODE_RADIUS},0
L0,${NODE_RADIUS}
L${-NODE_RADIUS},0
Z`);
      } else if (d.type === ENTITY_TYPES.SUPERNODE) {
        let dString = self.getSuperNodeHull(d);
        if (dString !== null) {
          el.select('.border')
            .transition('transition')
            .attr('d', dString);
        }
        // put supernodes on the bottom
        let firstChild = this.parentNode.firstChild;
        if (firstChild) {
          this.parentNode.insertBefore(this, firstChild);
        }
      }
    });
  }
  getSuperNodeHull (d) {
    let centerOffset = this.graph.ghostNodes[this.graph.ghostNodeLookup[d.center]];
    if (centerOffset.x === undefined || centerOffset.y === undefined) {
      return null;
    }
    let allPoints = d.junctions.map(id => {
      let ghost = this.graph.ghostNodes[this.graph.ghostNodeLookup[id]];
      return [ghost.x - centerOffset.x, ghost.y - centerOffset.y];
    }).concat(d.children.map(id => {
      let child = this.graph.entities[this.graph.entityLookup[id]];
      let ghost = this.graph.ghostNodes[this.graph.ghostNodeLookup[child.center]];
      return [ghost.x - centerOffset.x, ghost.y - centerOffset.y];
    }));
    let hull = d3.polygonHull(allPoints);
    return SUPERNODE_CURVE(hull);
  }
  drawArcs (d3el, transition) {
    this.visualArcs = d3el.select('#arcs')
      .selectAll('.arc').data(this.graph.arcs);
    this.visualArcs.exit()
      .transition()
      .attr('opacity', 0)
      .remove();
    let arcsEnter = this.visualArcs.enter().append('g')
      .classed('arc', true);
    this.visualArcs = this.visualArcs.merge(arcsEnter);

    arcsEnter.append('path');
  }
  simulationTick (d3el) {
    if (this.graph) {
      let self = this;
      this.visualEntities.each(function (d) {
        let el = d3.select(this);
        let center = self.graph.ghostNodes[self.graph.ghostNodeLookup[d.center]];
        el.attr('transform', 'translate(' + center.x + ',' + center.y + ')');
        if (d.type === ENTITY_TYPES.SUPERNODE) {
          let dString = self.getSuperNodeHull(d);
          if (dString !== null) {
            el.select('.border').attr('d', dString);
          }
        } else if (d.type === ENTITY_TYPES.NODE) {
          // constrain all junctions such that they are within NODE_RADIUS
          d.junctions.forEach(id => {
            let junction = self.graph.ghostNodes[self.graph.ghostNodeLookup[id]];
            let dx = junction.x - center.x;
            let dy = junction.y - center.y;
            let dinv = NODE_RADIUS / Math.sqrt(dx ** 2 + dy ** 2);
            junction.x = (1 - dinv) * center.x + dinv * junction.x;
            junction.y = (1 - dinv) * center.y + dinv * junction.y;
          });
        }
      });
      this.visualArcs.each(function (d) {
        let el = d3.select(this);
        let arcPoints = d.junctions.map(id => {
          let junction = self.graph.ghostNodes[self.graph.ghostNodeLookup[id]];
          return [junction.x, junction.y];
        });
        el.select('path').attr('d', ARC_CURVE(arcPoints));
      });
      if (DEBUG) {
        d3el.select('#ghostNodes').selectAll('.node')
          .attr('r', 5)
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
        d3el.select('#ghostEdges').selectAll('.edge')
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
      }
    }
  }
  drawDebuggingLayers (d3el) {
    let nodes = d3el.select('#ghostNodes')
      .selectAll('.node').data(this.graph.ghostNodes);
    let edges = d3el.select('#ghostEdges')
      .selectAll('.edge').data(this.graph.ghostEdges);

    let nodesEnter = nodes.enter()
      .append('circle').classed('node', true);
    nodes = nodes.merge(nodesEnter);
    nodes.on('click', d => { console.log(d.type, d.id); });
    let edgesEnter = edges.enter()
      .append('line').classed('edge', true);
    edges = edges.merge(edgesEnter);
    edges.on('click', d => { console.log(d.type, d.id); });
  }
  hideSpinner (d3el) {
    d3el.select('#spinner')
      .style('visibility', 'hidden');
  }
  addArc (ascendingIds, descendingIds) {
    let firstId = ascendingIds.length > 0 ? ascendingIds[0] : descendingIds[0];
    let lastId = descendingIds.length > 0
      ? descendingIds[descendingIds.length - 1]
      : ascendingIds[ascendingIds.length - 1];
    let arc = {
      id: firstId + '>' + lastId,
      junctions: [],
      ghostEdges: [],
      sourceVisible: false,
      ascentVisible: false,
      descentVisible: false,
      targetVisible: false
    };
    let firstVisibleId;
    let lastVisibleId;
    ascendingIds.forEach((id, index) => {
      let entityId = this.graph.entityLookup[id];
      if (entityId !== undefined) {
        arc.ascentVisible = true;
        if (!firstVisibleId) {
          firstVisibleId = id;
        }
        lastVisibleId = id;
        if (index === 0) {
          arc.sourceVisible = true;
        }
        let junctionId = this.addGhostNode({
          id: arc.id + '[' + id + ']',
          type: GHOST_NODE_TYPES.JUNCTION
        });
        arc.junctions.push(junctionId);
        this.graph.entities[entityId].junctions.push(junctionId);
      }
    });
    descendingIds.forEach((id, index) => {
      let entityId = this.graph.entityLookup[id];
      if (entityId !== undefined) {
        arc.descentVisible = true;
        if (!firstVisibleId) {
          firstVisibleId = id;
        }
        lastVisibleId = id;
        if (index === descendingIds.length - 1) {
          arc.targetVisible = true;
        }
        let junctionId = this.addGhostNode({
          id: arc.id + '[' + id + ']',
          type: GHOST_NODE_TYPES.JUNCTION
        });
        arc.junctions.push(junctionId);
        this.graph.entities[entityId].junctions.push(junctionId);
      }
    });
    if (arc.junctions.length < 2) {
      // the arc isn't even visible; don't add it
      return null;
    }
    // If either end is pointing up the hierarchy beyond where we can see, we
    // need to add a loose node
    if (!arc.ascentVisible) {
      let externalId = this.addGhostNode({
        id: arc.id + '[ascent]',
        type: GHOST_NODE_TYPES.EXTERNAL
      });
      arc.junctions.unshift(externalId);
    }
    if (!arc.descentVisible) {
      let externalId = this.addGhostNode({
        id: arc.id + '[descent]',
        type: GHOST_NODE_TYPES.EXTERNAL
      });
      arc.junctions.push(externalId);
    }
    // Okay, now that we know about our ghost junctions,
    // create ghost edges between them
    for (let i = 0; i < arc.junctions.length - 1; i++) {
      let a = arc.junctions[i];
      let b = arc.junctions[i + 1];
      let ghostEdgeId = this.addGhostEdge(a, b);
      arc.ghostEdges.push(ghostEdgeId);
    }
    // Add the first and last ghost edges (external edges will already have been
    // created)
    if (arc.ascentVisible) {
      let firstCenter = this.graph.entities[this.graph.entityLookup[firstVisibleId]].center;
      let firstGhostId = this.addGhostEdge(firstCenter, arc.junctions[0]);
      arc.ghostEdges.unshift(firstGhostId);
    }
    if (arc.descentVisible) {
      let lastCenter = this.graph.entities[this.graph.entityLookup[lastVisibleId]].center;
      let lastGhostId = this.addGhostEdge(arc.junctions[arc.junctions.length - 1], lastCenter);
      arc.ghostEdges.push(lastGhostId);
    }

    // Finally, add the arc
    this.graph.arcLookup[arc.id] = this.graph.arcs.length;
    this.graph.arcs.push(arc);
    return arc.id;
  }
  async resolveReferences () {
    while (this.graph.unresolvedReferences.length > 0) {
      let source = this.graph.unresolvedReferences.shift();
      let targets = await source.selection.nodes();
      targets.forEach(target => {
        // Start at the source, and collect ids until
        // we encounter the deepest common ancestor
        let ascendingIds = [];
        let i = source.path.length - 1;
        while (i >= 0 && source.path[i] !== target.path[i]) {
          ascendingIds.push(source.path.slice(0, i + 1).join('.'));
          i -= 1;
        }
        // We're at the deepest common ancestor (or the link is pointing
        // to itself or a direct descendant)... we want the arc to route from
        // sibling to sibling, not through the parent, so just start down
        // the target path
        let descendingIds = [];
        while (i <= target.path.length - 1) {
          descendingIds.push(target.path.slice(0, i + 1).join('.'));
          i += 1;
        }
        this.addArc(ascendingIds, descendingIds);
      });
    }
  }
  showSpinner (d3el, windowBounds) {
    let spinner = d3el.select('#spinner');
    d3el.select('#spinner')
      .style('visibility', null);
    spinner
      .attr('x', windowBounds.width / 2 - SPINNER_SIZE.width / 2)
      .attr('y', windowBounds.height / 2 - SPINNER_SIZE.height / 2);
  }
  addReference ({ path, value }) {
    try {
      let selection = this.selection.selectAll(value);
      this.graph.unresolvedReferences.push({
        path,
        selection
      });
      return true;
    } catch (err) { if (!err.INVALID_SELECTOR) { throw err; } }
    return false;
  }
  addEntity (obj, { forceEdge = false } = {}) {
    let entity = this.createEntity(obj);
    entity.type = forceEdge ? ENTITY_TYPES.EDGE : ENTITY_TYPES.NODE;

    let valueType = typeof obj.value;
    if (valueType === 'string') {
      // Test if this is actually a reference (always interpret reference values
      // as "edges")
      if (this.addReference(obj)) {
        entity.type = ENTITY_TYPES.EDGE;
      }
    } else if (valueType === 'object') {
      // Collect any references that this entity contains one level down
      Object.keys(obj.value).forEach(grandChildKey => {
        let grandChildValue = obj.value[grandChildKey];
        if (typeof grandChildValue === 'string') {
          let grandChildPath = Array.from(obj.path);
          grandChildPath.push(grandChildKey);
          this.addReference({
            path: grandChildPath,
            value: grandChildValue
          });
        }
      });
    }

    this.graph.entityLookup[entity.id] = this.graph.entities.length;
    this.graph.entities.push(entity);
    return entity.id;
  }
  addSuperNode (obj) {
    let entity = this.createEntity(obj);
    entity.type = ENTITY_TYPES.SUPERNODE;
    entity.children = [];

    // add each superNode's immediate children
    Object.keys(obj.value).forEach(childKey => {
      let childValue = obj.value[childKey];
      let childPath = Array.from(obj.path);
      childPath.push(childKey);
      let childEntityId = this.addEntity({
        path: childPath,
        value: childValue
      });
      entity.children.push(childEntityId);
      let child = this.graph.entities[this.graph.entityLookup[childEntityId]];
      this.addGhostEdge(entity.center, child.center);
    });

    this.graph.entityLookup[entity.id] = this.graph.entities.length;
    this.graph.entities.push(entity);
    return entity.id;
  }
  createEntity (obj) {
    let entity = {
      id: obj.path.join('.'),
      docSelector: obj.path[0],
      label: obj.path[obj.path.length - 1],
      value: obj.value,
      junctions: []
    };
    entity.center = this.addGhostNode({
      id: entity.id + '>center',
      type: GHOST_NODE_TYPES.CENTER,
      entity
    });
    return entity;
  }
  addGhostNode (node) {
    if (!node) {
      do {
        node = {
          id: 'external' + EXTERNAL_INDEX,
          type: GHOST_NODE_TYPES.EXTERNAL
        };
        EXTERNAL_INDEX += 1;
      } while (this.graph.ghostNodes[node.id]);
    }
    this.graph.ghostNodeLookup[node.id] = this.graph.ghostNodes.length;
    this.graph.ghostNodes.push(node);
    return node.id;
  }
  addGhostEdge (a, b) {
    a = this.graph.ghostNodes[this.graph.ghostNodeLookup[a]];
    b = this.graph.ghostNodes[this.graph.ghostNodeLookup[b]];
    let type = a.type + '_' + b.type;
    let edge = {
      id: a.id + '>>' + b.id,
      source: a.id,
      target: b.id,
      type
    };
    this.graph.ghostEdgeLookup[edge.id] = this.graph.ghostEdges.length;
    this.graph.ghostEdges.push(edge);
    return edge.id;
  }
  async updateGraph () {
    if (this.selection === null) {
      this.graph = null;
      return;
    }
    /*
     * The nomenclature in this code is SUPER overloaded. There are THREE
     * different possible interpretations for what you might call an "edge": at
     * the lowest graph.ghostEdges level, "edges" refer to what we use for the
     * d3 force simulation (ghostNodes and ghostEdges enable natural spacing of
     * node elements and boundaries, as well as individual arc segments). The
     * middle "arcs" refer to the full paths that we draw between entities;
     * these are visual representations of resolved reference values, and
     * contain more than one ghostEdge. At the highest abstraction level,
     * "edges" are actually distinct entities that must live somewhere (in the
     * data, they may take the form of a reference string, or an object
     * containing reference strings that the user has explicitly designated as
     * an "edge"). As such, these abstract "edges" are stored alongside nodes
     * and supernodes in graph.entities
     */
    this.graph = {
      ghostNodes: [],
      ghostNodeLookup: {},
      ghostEdges: [],
      ghostEdgeLookup: {},
      entities: [],
      entityLookup: {},
      arcs: [],
      arcLookup: {},
      /*
       * unresolvedReferences is a temporary array of
       * { sourceNodeId, selection }
       * objects that still need to be evaluated to generate arcs and their
       * corresponding ghostEdges; this is populated and emptied immediately for
       * visible nodes pointing outward, and is lazily populated and evaluated
       * later for links that have hidden sources elsewhere in the graph
       */
      unresolvedReferences: []
    };

    // First create the nodes and their associated ghostNodes
    // (populates graph.unresolvedReferences)
    let firstLevelObjects = await this.selection.nodes();
    if (firstLevelObjects.length === 0) {
      this.graph = null;
      return;
    }
    firstLevelObjects.forEach(obj => {
      if (typeof obj.value === 'object') {
        // TODO: add / check metadata to see whether this should actually be
        // iterpreted as an edge. If so, we should do this instead:
        // this.addEntity(obj, { forceEdge: true });
        this.addSuperNode(obj);
      } else {
        this.addEntity(obj);
      }
    });
    // Resolve any references we encountered to create arcs and their
    // associated ghostEdges
    await this.resolveReferences();
    this.render();
  }
}
export default NodeLinkDD;
