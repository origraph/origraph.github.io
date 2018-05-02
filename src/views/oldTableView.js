import SlicedGraphView from './SlicedGraphView.js';

class TableView extends SlicedGraphView {
  async update (linkedViewSpec) {
    this.histograms = this.tableLayout = null;
    await super.update(linkedViewSpec); // 'Computing table layout...' spinner will be showing
    this.tableLayout = await this.computeTableLayout();
    this.render(); // 'Computing histograms...' spinner
    this.histograms = await this.computeHistograms();
    this.render();
  }
  drawContents (d3el) {
    if (!this.tableLayout) {
      this.showOverlay(d3el, {
        message: 'Computing table layout...',
        spinner: true
      });
    } else if (!this.histograms) {
      this.showOverlay(d3el, {
        message: 'Computing histograms...',
        spinner: true
      });
    } else {
      this.drawTables();
      this.hideOverlay();
    }
  }
  async computeHistograms () {
    throw new Error('unimplemented');
  }
  async getHistogramOrValue (entityId, { numBins = 5 } = {}) {
    let entity = this.lookup(entityId);
    if (entity._histogram) {
      return entity._histogram;
    }

    let childKeys;
    let childValues;
    let childRawTypes;
    if (entity.type === ENTITY_TYPES.target) {
      if (!entity.attributes) {
        // The entity has a primitive value
        entity._histogram = entity.value;
        return entity.value;
      } else {
        // the attribute entities will already have been created, including
        // type inference
        childKeys = Object.keys(entity.attributes);
        childValues = childKeys.map(attr => entity.attributes[attr]);
        childRawTypes = childValues.map(entity => entity.rawType);
      }
    } else if (entity.type === ENTITY_TYPES.attribute) {
      if (entity.rawType !== RAW_TYPES.object) {
        // The entity has a primitive value
        entity._histogram = entity.value;
        return entity.value;
      } else {
        // at this level, we never actually created the entities; we need
        // to do the type inference ourselves
        childKeys = Object.keys(entity.value);
        childValues = childKeys.map(attr => entity.value[attr]);
        childRawTypes = childKeys.map(key => {
          let path = Array.from(entity.path);
          path.push(key);
          let value = entity.value[key];
          return this.evaluateRawType({ path, value, skipAddingReferences: true });
        });
      }
    } else {
      // We'd need to fetch additional data to calculate accurate histograms for
      // parent or breadcrumb entities
      throw new Error(`Histograms are not supported for ${entity.type.toString()} entities`);
    }

    // Create a histogram; if all values are the same type, try to create a
    // natural one (up to numBins for categorical values, or numBins
    // quantitative ranges). If not, bin by type.
    let categoricalBins = {};
    let numericRange = {};
    let typeBins = {};
    for (let i = 0; i < childKeys.length; i++) {
      let value = childValues[i];
      let rawType = childRawTypes[i];

      typeBins[rawType] = (typeBins[rawType] || 0) + 1;
      if (rawType === RAW_TYPES.object || rawType === RAW_TYPES.reference) {
        // We encountered a reference or a container, so both categoricalBins
        // and numericRange are invalid
        categoricalBins = numericRange = null;
      }
      if (categoricalBins !== null) {
        if (Object.keys(categoricalBins).length <= numBins) {
          // categorical bins haven't been ruled out yet; count this value
          categoricalBins[value] = (categoricalBins[value] || 0) + 1;
        } else {
          // we've encountered too many categorical bins
          categoricalBins = null;
        }
      }
      if (numericRange !== null) {
        if (rawType === RAW_TYPES.number) {
          // numeric ranges have not yet been ruled out by a non-numeric value;
          // collect the min and max numbers seen
          if (numericRange.low === undefined) {
            numericRange = { low: value, high: value };
          } else {
            numericRange.low = Math.min(value, numericRange.low);
            numericRange.high = Math.max(value, numericRange.high);
          }
        } else {
          // We ran across something non-numeric
          numericRange = null;
        }
      }
    }

    // Now that we've collected the possibilities, we prefer categorical bins
    // first, numeric bins next (we need to do a second pass now that we can
    // calculate the bin size), and type histograms last
    if (categoricalBins) {
      entity._histogram = {
        histogramType: HISTOGRAM_TYPES.categorical,
        bins: categoricalBins
      };
    } else if (numericRange) {
      let rangeSize = (numericRange.high - numericRange.low) / numBins;
      let numericBins = Array.from(Array(numBins).keys()).map(i => {
        return {
          low: numericRange.low + i * rangeSize,
          high: numericRange.low + (i + 1) * rangeSize,
          count: 0
        };
      });
      // Do a second pass to get counts, now that we know bin sizes
      childValues.forEach(value => {
        let index = Math.floor((value - numericRange.low) / rangeSize);
        numericBins[index].count++;
      });
      entity._histogram = {
        histogramType: HISTOGRAM_TYPES.quantitative,
        bins: numericBins
      };
    } else {
      entity._histogram = {
        histogramType: HISTOGRAM_TYPES.type,
        bins: typeBins
      };
    }

    return entity._histogram;
  }
  async computeTableLayout () {
    // TODO: assign x, y, width, height to all slices, members, and cells
    let padding = this.emSize;
    let width = this.contentBounds.width - 2 * padding;
    width = this.emSize * Math.floor(width / this.emSize);
    let height = this.contentBounds.height - 2 * padding;
    height = this.emSize * Math.floor(height / this.emSize);
    let root = this.model.entities[this.model.rootIndex];
    this.layoutBreadcrumb(root, padding, padding, width, height);
  }
  async drawTables (d3el) {
    let t = this.createTransitionList();

    let svg = d3el.select('svg');

    let entities = svg.selectAll('.entity')
      .data(this.model.entities, d => d.uniqueSelector);
    entities.exit().remove();
    let entitiesEnter = entities.enter().append('g')
      .classed('entity', true);
    entities = entities.merge(entitiesEnter);

    entitiesEnter.attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', 0)
      .transition(t[0])
      .attr('opacity', 1);

    entities
      .attr('id', d => d.domId)
      .transition(t[0])
      .attr('transform', d => `translate(${d.x},${d.y})`);

    let self = this;
    entities.each(function (d) {
      let el = d3.select(this);
      if (d.layer === 1) {
        el.lower();
        self.drawTable(d, el, t);
      } else {
        el.raise();
        self.drawRow(d, el, t);
      }
    });
  }
  drawTable (d, el, t) {
    // breadcrumb section
    let breadcrumb = el.select('.breadcrumb');
    if (breadcrumb.size() === 0) {
      breadcrumb = el.append('g').classed('breadcrumb', true);
    }
    let breadcrumbChunks = breadcrumb.selectAll('.chunk')
      .data(d => this.model.getBreadcrumb(d.id));
    breadcrumbChunks.exit().remove();
    let breadcrumbChunksEnter = breadcrumbChunks.enter()
      .append('g').classed('chunk', true);
    breadcrumbChunks = breadcrumbChunks.merge(breadcrumbChunksEnter);

    breadcrumbChunks.text(d => d.humanReadable)
      .on('click', d => {
        window.mainApp.navigate({ selection: d.selector });
      });

    // TODO continue!
  }
  drawRow (d, el, t) {
    // TODO
  }
  drawOpenContainer (container) {
    container.text('{→}');
  }
  drawReference (container, value) {
    container.text('↗');
  }
  drawHistogram (container, value) {
    let bounds = container.node().getBoundingClientRect();
    let bins;
    if (value.histogramType === TwoLayerModel.HISTOGRAM_TYPES.type) {
      bins = Object.getOwnPropertySymbols(value.bins).map(key => {
        return { key, value: value.bins[key] };
      });
    } else {
      bins = d3.entries(value.bins);
    }
    let barWidth = (bounds.width - 1) / bins.length;

    let bars = container.selectAll('.bar')
      .data(bins);
    bars.exit().remove();
    let barsEnter = bars.enter().append('div').classed('bar', true);
    bars = bars.merge(barsEnter);

    let self = this;
    bars
      .style('width', barWidth + 'px')
      .style('left', (d, i) => i * barWidth + 'px')
      .style('height', d => {
        return this.histogramScale(d.value.count !== undefined ? d.value.count : d.value) + 'px';
      })
      .on('mouseenter', function (d) {
        self.showTooltip(this.getBoundingClientRect(),
          'Value: ' + d.key.toString() + '<br/>' +
          'Count: ' + (d.value.count !== undefined ? d.value.count : d.value));
      })
      .on('mouseleave', d => {
        self.hideTooltip();
      });
  }
}
export default TableView;
