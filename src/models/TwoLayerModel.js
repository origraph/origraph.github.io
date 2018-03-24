/* globals mure */
import { Model } from '../lib/uki.esm.js';
import createEnum from '../utils/createEnum.js';

let TYPES = createEnum([
  'boolean', 'number', 'string', 'date', 'undefined', 'null', 'reference', 'container', 'key', 'histogram'
]);
let INTERPRETATIONS = createEnum([
  'node', 'edge', 'supernode', 'hyperedge'
]);
let HISTOGRAM_TYPES = createEnum([
  'categorical', 'quantitative', 'type'
]);

class TwoLayerModel extends Model {
  constructor (selection, { histogramBins = 5 } = {}) {
    super();
    this.histogramBins = histogramBins;
    this.update(selection);
  }
  async update (selection = null) {
    this.selection = selection;
    /*
     * The nomenclature in this app is SUPER overloaded. There are THREE
     * different possible interpretations for what you might call an "edge": at
     * the lowest graph.ghostEdges level, "edges" refer to what we use for the
     * laying out a node-link diagram (ghostNodes and ghostEdges enable natural
     * spacing of node elements and boundaries, as well as individual arc
     * segments). The middle "arcs" refer to the full paths that we draw between
     * entities; these are visual representations of resolved reference values,
     * and contain more than one ghostEdge. At the highest abstraction level,
     * "edges" are actually distinct entities that must live somewhere (in the
     * data, they may take the form of a reference string, or an object
     * containing reference strings that the user has explicitly designated as
     * an "edge"). As such, these abstract "edges" are stored alongside nodes
     * and supernodes in graph.entities
     */
    this.entities = [];
    this.entityLookup = [];
    this.arcs = [];
    this.arcLookup = {};
    this.unresolvedReferences = [];

    this.isLoading = true;
    this.maxHistogramCount = 0;

    if (this.selection === null) {
      this.isLoading = false;
      this.trigger('update');
      return;
    }
    let firstLevelObjects = await this.selection.nodes({ includeMetadata: ['origraph'] });
    if (firstLevelObjects.length === 0) {
      this.isLoading = false;
      this.trigger('update');
      return;
    }

    // Create entities
    await Promise.all(firstLevelObjects.map(selectionResult => {
      return this.addEntity(selectionResult, 1);
    }));
    // Resolve any references that we encountered to generate arcs
    await this.resolveReferences();
    this.isLoading = false;
    this.trigger('update');
    return true;
  }
  evaluateType ({ path, value }) {
    let jsType = typeof value;
    if (TYPES[jsType]) {
      if (jsType === 'string' && value[0] === '@') {
        if (this.addReference({ path, value })) {
          return TYPES.reference;
        } else {
          return TYPES.string;
        }
      } else {
        return TYPES[jsType];
      }
    } else if (value === null) {
      return TYPES.null;
    } else if (value instanceof Date) {
      return TYPES.date;
    } else if (jsType === 'function' || jsType === 'symbol' || value instanceof Array) {
      throw new Error('invalid value: ' + value);
    } else {
      return TYPES.container;
    }
  }
  async addEntity (selectionResult, layer) {
    let entity = {
      id: selectionResult.uniqueSelector,
      layer,
      path: selectionResult.path,
      label: selectionResult.path[selectionResult.path.length - 1],
      value: selectionResult.value,
      type: this.evaluateType(selectionResult),
      sourceOfArcs: [],
      targetOfArcs: [],
      upRoutingArcs: [],
      downRoutingArcs: []
    };
    // Start with basic assumptions that may be overridden
    let interpretAsEdge = selectionResult.metadata &&
      selectionResult.metadata.origraph &&
      selectionResult.metadata.origraph.edge === true;
    if (interpretAsEdge) {
      // if the entity points to or contains more than one
      // other thing, this will be overridden as a hyperedge later when
      // we resolveReferences()
      entity.interpretation = INTERPRETATIONS.edge;
    } else {
      entity.interpretation = INTERPRETATIONS.node;
    }
    if (entity.type === TYPES.reference) {
      // References should always be interpreted as edges. As above, this may
      // still be overridden as a hyperedge after we resolveReferences()
      entity.interpretation = INTERPRETATIONS.edge;
    } else if (entity.type === TYPES.container) {
      if (layer === 1 && !interpretAsEdge) {
        // At the root level, interpret objects as supernodes. If this object
        // has been flagged as an edge, it isn't necessarily a hyperedge; for
        // that it must reference more than one element, and we only know that
        // after we resolveReferences()
        entity.interpretation = INTERPRETATIONS.supernode;
      }
      let children = [];
      if (layer <= 3) {
        // Layer 4 is only for helping layer 3 compute a histogram
        // with all the proper type information already deduced; no
        // need to probe its children
        let childKeys = Object.keys(selectionResult.value);
        for (let i = 0; i < childKeys.length; i++) {
          let childKey = childKeys[i];
          let childPath = Array.from(selectionResult.path);
          childPath.push(childKey);
          let fakeResult = {
            uniqueSelector: mure.pathToSelector(childPath),
            path: childPath,
            value: selectionResult.value[childKey]
          };
          let child = await this.addEntity(fakeResult, layer + 1);
          child.parent = entity.id;
          children.push(child);
        }
      }
      if (layer === 3) {
        // If we're an object at layer 3, replace our value with a
        // summary histogram of the layer 4 values
        entity.type = TYPES.histogram;
        entity.value = this.computeHistogram(children);
      } else if (layer === 2) {
        // Collect the attributes and values of objects at layer 2
        // (if those values are objects, they're converted to histograms)
        entity.attributes = {};
        children.forEach(child => {
          entity.attributes[child.label] = {
            type: child.type,
            value: child.value
          };
        });
      } else if (layer === 1) {
        // At layer 1, keep references to each layer 2 child entity
        entity.children = children.map(child => child.id);
      }
    }

    if (layer <= 2) {
      // only store entities for layers 1 and 2; 3 and 4 are just for
      // collecting attributes / summary statistics
      this.entityLookup[entity.id] = this.entities.length;
      this.entities.push(entity);
    }
    return entity;
  }
  addReference ({ path, value }) {
    // TODO: for now, this function is only called internally with the
    // references that we encounter directly (in the two layers of this model,
    // or in the two below it that are accessed to collect attribute values /
    // summary statistics). In the future, I should initiate a background task
    // that lazily calls looks for references either of our two current layers
    // in all files, and fires resolveReferences() in batches to add the results
    // to the view
    try {
      // Following the convention in the mure documentation, we want all queries
      // to be evaluated relative to their containing document; evaluating
      // .nodes() already gives us an explicit document selector (by id) as the
      // first item in the path
      let docSelection = mure.select('@' + path[0]);
      let selection = docSelection.selectAll(value);
      this.unresolvedReferences.push({
        path,
        selection
      });
      return true;
    } catch (err) { if (!err.INVALID_SELECTOR) { throw err; } }
    return false;
  }
  computeHistogram (entityArray, { numBins = this.histogramBins } = {}) {
    // Create a histogram; if all values are the same type, try to create a
    // natural one (up to numBins for categorical values, or numBins
    // quantitative ranges). If not, bin by type.
    let categoricalBins = {};
    let numericRange = {};
    let typeBins = {};
    entityArray.forEach(entity => {
      // TODO: bin by interpretation as well as type?
      typeBins[entity.type] = (typeBins[entity.type] || 0) + 1;
      if (entity.type === TYPES.container || entity.type === TYPES.reference) {
        // We encountered a reference or a container, so both categoricalBins
        // and numericRange are invalid
        categoricalBins = numericRange = null;
      }
      if (categoricalBins !== null) {
        if (Object.keys(categoricalBins).length <= numBins) {
          // categorical bins haven't been ruled out yet; count this value
          categoricalBins[entity.value] = (categoricalBins[entity.value] || 0) + 1;
        } else {
          // we've encountered too many categorical bins
          categoricalBins = null;
        }
      }
      if (numericRange !== null) {
        if (entity.type === TYPES.number) {
          // numeric ranges have not yet been ruled out by a non-numeric value;
          // collect the min and max numbers seen
          if (numericRange.low === undefined) {
            numericRange = { low: entity.value, high: entity.value };
          } else {
            numericRange.low = Math.min(entity.value, numericRange.low);
            numericRange.high = Math.max(entity.value, numericRange.high);
          }
        } else {
          // We ran across something non-numeric
          numericRange = null;
        }
      }
    });
    if (categoricalBins) {
      this.maxHistogramCount = Math.max(this.maxHistogramCount,
        ...Object.keys(categoricalBins).map(k => categoricalBins[k]));
      // In order of preference, we prefer categorical bins first:
      return {
        histogramType: HISTOGRAM_TYPES.categorical,
        bins: categoricalBins
      };
    } else if (numericRange) {
      // ... numeric ranges second:
      let rangeSize = (numericRange.high - numericRange.low) / numBins;
      let numericBins = Array.from(Array(numBins).keys()).map(i => {
        return {
          low: numericRange.low + i * rangeSize,
          high: numericRange.low + (i + 1) * rangeSize,
          count: 0
        };
      });
      entityArray.forEach(child => {
        let index = Math.floor((child.value - numericRange.low) / rangeSize);
        numericBins[index].count++;
        this.maxHistogramCount = Math.max(this.maxHistogramCount,
          numericBins[index].count);
      });
      return {
        histogramType: HISTOGRAM_TYPES.quantitative,
        bins: numericBins
      };
    } else {
      this.maxHistogramCount = Math.max(this.maxHistogramCount,
        ...Object.getOwnPropertySymbols(typeBins).map(k => typeBins[k]));
      // ... and bins by type last:
      return {
        histogramType: HISTOGRAM_TYPES.type,
        bins: typeBins
      };
    }
  }
  async resolveReferences () {
    let resolvedArcIds = [];
    while (this.unresolvedReferences.length > 0) {
      let source = this.unresolvedReferences.shift();
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
        let arc = this.addArc(ascendingIds, descendingIds).id;
        if (arc) {
          resolvedArcIds.push(arc.id);
        }
      });
    }
    return resolvedArcIds;
  }
  addArc (ascendingIds, descendingIds) {
    let firstId = ascendingIds.length > 0 ? ascendingIds[0] : descendingIds[0];
    let lastId = descendingIds.length > 0
      ? descendingIds[descendingIds.length - 1]
      : ascendingIds[ascendingIds.length - 1];
    let arc = {
      id: firstId + '>' + lastId,
      routesUpThrough: [],
      routesDownThrough: []
    };
    ascendingIds.forEach((id, index) => {
      let entityIndex = this.entityLookup[id];
      if (this.entityLookup[id] !== undefined) {
        let entity = this.entities[entityIndex];
        if (index === 0) {
          arc.source = id;
          entity.sourceOfArcs.push(arc.id);
        } else {
          arc.routesUpThrough.push(id);
          entity.upRoutingArcs.push(arc.id);
        }
      }
    });
    descendingIds.forEach((id, index) => {
      let entityIndex = this.entityLookup[id];
      if (this.entityLookup[id] !== undefined) {
        let entity = this.entities[entityIndex];
        if (index === descendingIds.length) {
          arc.target = id;
          entity.targetOfArcs.push(arc.id);
        } else {
          arc.routesDownThrough.push(id);
          entity.downRoutingArcs.push(arc.id);
        }
      }
    });
    if (arc.routesUpThrough.length > 0 || arc.routesDownThrough.length > 0) {
      // the only bother adding the arc if some entity touches it
      this.graph.arcLookup[arc.id] = this.graph.arcs.length;
      this.graph.arcs.push(arc);
      return arc;
    } else {
      return null;
    }
  }
  getBreadcrumb (entityId) {
    let entity = this.entities[this.entityLookup[entityId]];
    let entries = [{
      humanReadable: 'All Documents',
      selector: null
    }];
    entity.path.forEach((chunk, i) => {
      if (chunk !== '$') {
        let entry = {
          selector: mure.pathToSelector(entity.path.slice(0, i + 1))
        };
        if (i === 0) {
          entry.humanReadable = /{.*;(.*)"}/.exec(chunk)[1];
        } else {
          entry.humanReadable = chunk;
        }
        entries.push(entry);
      }
    });
    return entries;
  }
  getTable (entityId) {
    let entity = this.entities[this.entityLookup[entityId]];
    if (!entity.children) {
      return null;
    }
    let children = entity.children.map(childId => {
      return this.entities[this.entityLookup[childId]];
    });
    let columnHeaders = children.reduce((agg, child) => {
      return agg.concat(Object.keys(child.attributes)
        .filter(d => agg.indexOf(d) === -1));
    }, []);
    let data = [];
    let rowHeaders = [];
    children.forEach(child => {
      rowHeaders.push(child.label);
      let row = columnHeaders.map(attr => {
        return child.attributes[attr];
      });
      data.push(row);
    });

    return { data, columnHeaders, rowHeaders };
  }
  getVector (entityId) {
    let entity = this.entities[this.entityLookup[entityId]];
    let columnHeaders = ['Value'];
    let data = [];
    let rowHeaders = [];
    Object.keys(entity.attributes).forEach(label => {
      rowHeaders.push(label);
      data.push(entity.attributes[label]);
    });
    return { data, columnHeaders, rowHeaders };
  }
}
TwoLayerModel.TYPES = TYPES;
TwoLayerModel.INTERPRETATIONS = INTERPRETATIONS;
TwoLayerModel.HISTOGRAM_TYPES = HISTOGRAM_TYPES;

export default TwoLayerModel;
