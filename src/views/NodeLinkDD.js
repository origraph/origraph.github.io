/* globals d3 */
import { View } from '../uki.es.js';

function createEnum (entries) {
  let temp = {};
  entries.forEach(entry => { temp[entry] = entry; });
  return Object.freeze(temp);
}

let SPINNER_SIZE = {
  width: 550,
  height: 400
};

let NODE_RADIUS = 7;
let CIRCLE_NODE_CUBIC_OFFSET = 5 * NODE_RADIUS / 9; // for approximating circles with cubic paths

let EXTERNAL_INDEX = 0;

let GHOST_NODE_TYPES = createEnum([
  'CENTER',
  'JUNCTION',
  'EXTERNAL'
]);

let GHOST_EDGE_TYPES = createEnum([

]);
//  AC, // child node center to super node center
//  AB, // child node center to child node junction
//  BD, // child node junction to super node junction
//  DD, // super node junction to super node junction
//  DE  // super node junction to external

let ENTITY_TYPES = createEnum([
  'NODE', // primitive values
  'SUPERNODE', // objects
  'EDGE' // reference or object containing references that has been flagged by the user as an edge
]);

class NodeLinkDD extends View {
  constructor (selection = null) {
    super();
    this.selection = selection;
    this.updateGraph();
  }
  setSelection (selection) {
    this.selection = selection;
    this.render();
    this.updateGraph();
  }
  setup (d3el) {
    if (d3el.select('#arcs').size() === 0) {
      d3el.append('g').attr('id', 'arcs');
    }
    if (d3el.select('#entities').size() === 0) {
      d3el.append('g').attr('id', 'entities');
    }
    if (d3el.select('#spinner').size() === 0) {
      d3el.append('image').attr('id', 'spinner')
        .attr('width', SPINNER_SIZE.width)
        .attr('height', SPINNER_SIZE.height)
        .attr('href', 'spinner.gif');
    }

    this.visualEntities = d3.select('#entities')
      .selectAll('.entity');
    this.visualLinks = d3.select('#arcs')
      .selectAll('.arc');

    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter())
      .on('tick', () => { this.simulationTick(d3el); });
  }
  draw (d3el) {
    let bounds = d3el.node().getBoundingClientRect();
    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);

    if (this.graph === null) {
      this.showSpinner(d3el, bounds);
    } else {
      this.hideSpinner(d3el);

      this.simulation.nodes(this.graph.ghostNodes);
      this.simulation.force('link')
        .links(this.graph.ghostEdges);

      let transition = d3.transition().duration(200);

      this.drawEntities(d3el, transition);
      this.drawArcs(d3el, transition);
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
    this.visualEntities.each(function (d) {
      let el = d3.select(this);
      if (d.type === ENTITY_TYPES.NODE) {
        el.select('.border')
          .transition(transition)
          .attr('d', `
M0,${-NODE_RADIUS}
C${CIRCLE_NODE_CUBIC_OFFSET},${-NODE_RADIUS},
${NODE_RADIUS},${-CIRCLE_NODE_CUBIC_OFFSET},
${NODE_RADIUS},0,
C${NODE_RADIUS},${CIRCLE_NODE_CUBIC_OFFSET},
${CIRCLE_NODE_CUBIC_OFFSET},${NODE_RADIUS},
0,${NODE_RADIUS},
C${-CIRCLE_NODE_CUBIC_OFFSET},${NODE_RADIUS},
${-NODE_RADIUS},${CIRCLE_NODE_CUBIC_OFFSET},
${-NODE_RADIUS},0,
C${-NODE_RADIUS},${-CIRCLE_NODE_CUBIC_OFFSET},
${-CIRCLE_NODE_CUBIC_OFFSET},${-NODE_RADIUS},
0,${-NODE_RADIUS}
Z`);
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
        // TODO
        el.select('.border')
          .transition('transition')
          .attr('d', '');
      }
    });
  }
  drawArcs (d3el, transition) {
    // TODO
  }
  simulationTick (d3el) {
    let self = this;
    this.visualEntities.each(function (d) {
      let el = d3.select(this);
      let center = self.graph.ghostNodes[self.graph.ghostNodeLookup[d.center]];
      el.attr('transform', 'translate(' + center.x + ',' + center.y + ')');
    });
    // TODO: update arcs
  }
  hideSpinner (d3el) {
    d3el.select('#spinner')
      .style('visibility', 'hidden');
  }
  addArc (sourceId, junctionIds, targetId) {
    console.log(sourceId, junctionIds, targetId);
  }
  async resolveReferences () {
    while (this.graph.unresolvedReferences.length > 0) {
      let source = this.graph.unresolvedReferences.shift();
      let sourceId = source.path.join('.');
      let targets = await source.selection.nodes();
      targets.forEach(target => {
        let targetId = target.path.join('.');
        let junctionIds = [];
        // Start at the source's parent, and collect ids until
        // we encounter the deepest common ancestor
        let i = source.path.length - 1;
        while (i >= 1 && source.path[i - 1] !== target.path[i - 1]) {
          junctionIds.push(source.path.slice(i - 1).join('.'));
          i -= 1;
        }
        // We're at the deepest common ancestor (or the link is pointing
        // to itself or a direct descendant)... we want the arc to route from
        // sibling to sibling, not through the parent, so just start down
        // the target path
        while (i < target.path.length - 1) {
          junctionIds.push(target.path.slice(i).join('.'));
          i += 1;
        }
        this.addArc(sourceId, junctionIds, targetId);
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
      junctions: {}
    };
    entity.center = this.addGhostNode({
      id: entity.id + '>g>center',
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
