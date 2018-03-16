/* globals d3 */
import { View } from '../uki.es.js';

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

let DEBUG_GHOSTS = true;

let SPINNER_SIZE = {
  width: 550,
  height: 400
};

let NODE_RADIUS = 14;
let STANDARD_CIRCLE = getCirclePath(NODE_RADIUS);
let STANDARD_DIAMOND = `
M0,${-NODE_RADIUS}
L${NODE_RADIUS},0
L0,${NODE_RADIUS}
L${-NODE_RADIUS},0
Z`;

let ARC_CURVE = d3.line().curve(d3.curveCatmullRom.alpha(1));
let SUPERNODE_CURVE = d3.line().curve(d3.curveCatmullRomClosed.alpha(1));

let GHOST_NODE_TYPES = createEnum([
  'NODE_CENTER',
  'NODE_JUNCTION',
  'EDGE_CENTER',
  'EDGE_JUNCTION',
  'SUPER_CENTER',
  'SUPER_JUNCTION',
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
    this.updateGraph(selection);
  }
  setup (d3el) {
    this.bounds = d3el.node().getBoundingClientRect();
    if (d3el.select('#superNodes').size() === 0) {
      d3el.append('g').attr('id', 'arcs');
    }
    if (d3el.select('#arcs').size() === 0) {
      d3el.append('g').attr('id', 'arcs');
    }
    if (d3el.select('#entities').size() === 0) {
      d3el.append('g').attr('id', 'entities');
    }
    if (DEBUG_GHOSTS) {
      if (d3el.select('#ghostEdges').size() === 0) {
        d3el.append('g').attr('id', 'ghostEdges');
      }
      if (d3el.select('#ghostNodes').size() === 0) {
        d3el.append('g').attr('id', 'ghostNodes');
      }
    }
    if (d3el.select('#message').size() === 0) {
      d3el.append('text').attr('id', 'message');
    }
    if (d3el.select('#spinner').size() === 0) {
      d3el.append('image').attr('id', 'spinner')
        .attr('width', SPINNER_SIZE.width)
        .attr('height', SPINNER_SIZE.height)
        .attr('href', 'spinner.gif');
    }
  }
  draw (d3el) {
    this.bounds = d3el.node().getBoundingClientRect();

    if (this.graph === undefined) {
      this.showMessage(d3el, 'Loading graph...');
      this.showSpinner(d3el);
    } else if (this.graph === null) {
      this.showMessage(d3el, 'No data selected');
      this.hideSpinner(d3el);
    } else if (this.layoutReady === false) {
      this.showMessage(d3el, 'Computing graph layout...');
      this.showSpinner(d3el);
      this.updateLayout();
    } else {
      this.hideMessage(d3el);
      this.hideSpinner(d3el);
      let transition = d3.transition().duration(200);
      this.drawEntities(d3el, transition);
      this.drawArcs(d3el, transition);
      if (DEBUG_GHOSTS) {
        this.drawDebuggingLayers(d3el, transition);
      }
    }
  }
  showMessage (d3el, message) {
    d3el.select('#message')
      .text(message)
      .attr('x', this.bounds.width / 2)
      .attr('y', this.bounds.height / 2)
      .style('visibility', null);
  }
  hideMessage (d3el) {
    d3el.select('#message')
      .style('visiblity', 'hidden');
  }
  showSpinner (d3el) {
    let spinner = d3el.select('#spinner');
    d3el.select('#spinner')
      .style('visibility', null);
    spinner
      .attr('x', this.bounds.width / 2 - SPINNER_SIZE.width / 2)
      .attr('y', this.bounds.height / 2 - SPINNER_SIZE.height / 2);
  }
  hideSpinner (d3el) {
    d3el.select('#spinner')
      .style('visibility', 'hidden');
  }
  drawEntities (d3el, transition) {
    let superNodes = [];
    let otherEntities = [];
    this.graph.entities.forEach(entity => {
      if (entity.type === ENTITY_TYPES.SUPERNODE) {
        superNodes.push(entity);
      } else {
        otherEntities.push(entity);
      }
    });

    superNodes = d3el.select('#superNodes')
      .selectAll('.entity').data(superNodes, d => d.id);
    otherEntities = d3el.select('#entities')
      .selectAll('.entity').data(otherEntities, d => d.id);

    superNodes.exit().transition(transition).attr('opacity', 0).remove();
    let superNodesEnter = superNodes.enter()
      .append('g').classed('entity', true);
    superNodes = superNodes.merge(superNodesEnter);

    otherEntities.exit().transition(transition).attr('opacity', 0).remove();
    let otherEntitiesEnter = otherEntities.enter()
      .append('g').classed('entity', true);

    let allEntitiesEnter = superNodesEnter.merge(otherEntitiesEnter);
    let allEntities = superNodes.merge(otherEntities);

    allEntitiesEnter.attr('opacity', 0).transition(transition).attr('opacity', 1);
    allEntitiesEnter.append('path').classed('border', true).attr('d', '');

    allEntities.transition(transition)
      .attr('transform', d => {
        let center = this.graph.ghostNodes[this.graph.ghostNodeLookup[d.center]];
        return 'translate(' + center.x + ',' + center.y + ')';
      }).attr('d', d => {
        if (d.type === ENTITY_TYPES.NODE) {
          return STANDARD_CIRCLE;
        } else if (d.type === ENTITY_TYPES.EDGE) {
          return STANDARD_DIAMOND;
        } else if (d.type === ENTITY_TYPES.SUPERNODE) {
          return this.getSuperNodeHull(d);
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
    let arcs = d3el.select('#arcs')
      .selectAll('.arc').data(this.graph.arcs, d => d.id);
    arcs.exit().transition(transition).attr('opacity', 0).remove();
    let arcsEnter = arcs.enter().append('g').classed('arc', true);
    arcs = arcs.merge(arcsEnter);

    arcsEnter.attr('opacity', 0).transition(transition).attr('opacity', 1);
    arcsEnter.append('path');

    arcs.transition(transition).attr('d', d => {
      let arcPoints = d.junctions.map(id => {
        let junction = this.graph.ghostNodes[this.graph.ghostNodeLookup[id]];
        return [junction.x, junction.y];
      });
      return ARC_CURVE(arcPoints);
    });
  }
  drawDebuggingLayers (d3el, transition) {
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

    nodes.transition(transition)
      .attr('r', 5)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    edges.selectAll('.edge')
      .transition(transition)
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
  }
  async updateLayout () {
    if (this.layoutReady) {
      // redundant call; we can exit early
      return true;
    }
    if (!this.bounds) {
      // we don't have an element to render to yet; wait for draw() to call this
      // function again before figuring out the layout
      this.layoutReady = false;
      return false;
    }
    // TODO
    return true;
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
    // After resolving a set of references, we need to update the layout
    // (but don't bother waiting around for it to finish to signal that
    // we've finished resolving the references)
    this.updateLayout();
    return true;
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
    let tryToAddJunction = (id, index) => {
      let entityId = this.graph.entityLookup[id];
      if (entityId !== undefined) {
        let entity = this.graph.entities[entityId];
        if (!firstVisibleId) {
          firstVisibleId = id;
        }
        lastVisibleId = id;
        let junctionId = this.addGhostNode({
          id: arc.id + '[' + id + ']',
          type: entity.type + '_JUNCTION'
        });
        arc.junctions.push(junctionId);
        this.graph.entities[entityId].junctions.push(junctionId);
        return true;
      }
      return false;
    };
    ascendingIds.forEach((id, index) => {
      arc.ascentVisible = tryToAddJunction(id, index) || arc.ascentVisible;
      if (arc.ascentVisible && index === 0) {
        arc.sourceVisible = true;
      }
    });
    descendingIds.forEach((id, index) => {
      arc.descentVisible = tryToAddJunction(id, index) || arc.descentVisible;
      if (arc.descentVisible && index === descendingIds.length - 1) {
        arc.descentVisible = true;
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
  addReference ({ path, value }) {
    // TODO: for now, this function is only called internally with the references
    // that we encounter while drawing them directly. In the future, I should initiate
    // a background task that lazily calls this function for all references in all
    // datasets, and fire resolveReferences() in batches to add the results to
    // the view
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
    let type = forceEdge ? ENTITY_TYPES.EDGE : ENTITY_TYPES.NODE;
    let entity = this.createEntity(obj, type);

    let valueType = typeof obj.value;
    if (valueType === 'string') {
      // Test if this is actually a reference (always interpret reference values
      // as "edges"); if so, override its type
      if (this.addReference(obj)) {
        entity.type = ENTITY_TYPES.EDGE;
        let center = this.graph.ghostNodes[this.graph.ghostLookup[entity.center]];
        center.type = 'EDGE_CENTER';
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
    let entity = this.createEntity(obj, ENTITY_TYPES.SUPERNODE);
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
  createEntity (obj, type) {
    let entity = {
      id: obj.path.join('.'),
      type,
      docSelector: obj.path[0],
      label: obj.path[obj.path.length - 1],
      value: obj.value,
      junctions: []
    };
    entity.center = this.addGhostNode({
      id: entity.id + '>center',
      type: type + '_CENTER',
      entity
    });
    return entity;
  }
  addGhostNode (node) {
    this.graph.ghostNodeLookup[node.id] = this.graph.ghostNodes.length;
    this.graph.ghostNodes.push(node);
    return node.id;
  }
  addGhostEdge (a, b) {
    a = this.graph.ghostNodes[this.graph.ghostNodeLookup[a]];
    b = this.graph.ghostNodes[this.graph.ghostNodeLookup[b]];
    let type = a.type + '>>' + b.type;
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
  async updateGraph (selection = null) {
    this.selection = selection;
    this.graph = undefined;
    this.layoutReady = false;
    if (this.d3el) {
      this.render(); // show the spinner before updating the graph
    }
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
    return this.resolveReferences();
  }
}
export default NodeLinkDD;
