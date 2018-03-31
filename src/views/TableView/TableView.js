/* globals Handsontable, d3 */
import { View } from '../../lib/uki.esm.js';
import TwoLayerModel from '../../models/TwoLayerModel.js';

class TableView extends View {
  constructor (d3el, twoLayerModel) {
    super(d3el, {
      style: 'views/TableView/style.css',
      text: 'views/TableView/template.html'
    });

    this.setModel(twoLayerModel);

    Handsontable.renderers.registerRenderer('generic',
      (...argList) => { this.drawCell(...argList); });
  }
  setModel (twoLayerModel) {
    this.model = twoLayerModel;
    this.model.on('update', () => {
      this.render();
    });
    this.render();
  }
  setup (d3el) {
    d3el.html(this.resources.text);
  }
  async draw (d3el) {
    this.hideTooltip();
    if (this.model.isLoading) {
      this.showOverlay(d3el, {
        message: 'Loading tables...',
        spinner: true
      });
    } else if (this.model.entities.length === 0) {
      this.showOverlay(d3el, {
        message: 'No data selected',
        spinner: false
      });
    } else {
      this.showOverlay(d3el, {
        message: '',
        spinner: true
      });
      await this.drawTables(d3el);
      this.hideOverlay(d3el);
    }
  }
  async drawTables (d3el) {
    if (!this.handsontables) {
      this.handsontables = {};
    }

    this.barColorMap = d3.scaleOrdinal(d3.schemeDark2);
    this.histogramScale = d3.scaleLinear()
      .domain([0, this.model.maxHistogramCount])
      .range([0, 20]); // TODO: hard-coding size of cells... ?

    let layer1 = this.model.entities.filter(d => d.layer === 1);
    let tables = d3el.select('#contents')
      .selectAll('.layer1').data(layer1, d => d.id);
    tables.exit()
      .each(d => { delete this.handsontables[d.id]; })
      .remove();
    let tablesEnter = tables.enter().append('div')
      .classed('layer1', true);
    tables = tables.merge(tablesEnter);

    // Breadcrumb section
    tablesEnter.append('div').classed('breadcrumb', true);

    let breadcrumbChunks = tables.select('.breadcrumb')
      .selectAll('.chunk').data(d => this.model.getBreadcrumb(d.id));
    breadcrumbChunks.exit().remove();
    let breadcrumbChunksEnter = breadcrumbChunks.enter().append('div')
      .classed('chunk', true);
    breadcrumbChunks = breadcrumbChunks.merge(breadcrumbChunksEnter);

    breadcrumbChunks.text(d => d.humanReadable)
      .on('click', d => {
        window.mainApp.navigate({ selection: d.selector });
      });

    // TODO: Main table section
    tablesEnter.append('div').classed('mainTable', true);

    let self = this;
    tables.select('.mainTable').each(function (d) {
      let table = self.model.getTable(d.id);
      let settings = {
        data: table.data,
        colHeaders: table.columnHeaders,
        rowHeaders: table.rowHeaders,
        cells: () => { return { renderer: 'generic' }; },
        manualColumnResize: true,
        manualRowResize: true,
        manualColumnMove: true,
        manualRowMove: true,
        rowHeaderWidth: 100,
        fixedColumnsLeft: 1
      };

      let idealHeight = Math.max(4, settings.data.length + 1) *
        1.8 * self.emSize;
      idealHeight = Math.min(idealHeight, window.innerHeight);
      d3.select(this).style('height', idealHeight + 'px');

      if (!self.handsontables[d.id]) {
        self.handsontables[d.id] = new Handsontable(this, settings);
      } else {
        self.handsontables[d.id].updateSettings(settings);
      }
    });
  }
  drawCell (...argList) {
    // Apply the classes that enable default selection, etc
    let td = argList[1];
    let content = argList[5] || { type: TwoLayerModel.TYPES.undefined };
    argList[5] = content.value;
    Handsontable.renderers.BaseRenderer(...argList);
    let container = d3.select(td)
      .attr('class', null);
    switch (content.type) {
      case TwoLayerModel.TYPES.boolean:
        Handsontable.renderers.CheckboxRenderer(...argList);
        break;
      case TwoLayerModel.TYPES.number:
        Handsontable.renderers.NumericRenderer(...argList);
        break;
      case TwoLayerModel.TYPES.date:
        Handsontable.renderers.DateRenderer(...argList);
        break;
      case TwoLayerModel.TYPES.containerPlaceholder:
        this.drawOpenContainer(container.classed('containerPlaceholder', true));
        break;
      case TwoLayerModel.TYPES.reference:
        this.drawReference(container.classed('reference', true), content.value);
        break;
      case TwoLayerModel.TYPES.histogram:
        this.drawHistogram(container.classed('histogram', true), content.value);
        break;
      case TwoLayerModel.TYPES.container:
        throw new Error('Attempted to render a container instead of a histogram');
      case TwoLayerModel.TYPES.key:
      case TwoLayerModel.TYPES.string:
      case TwoLayerModel.TYPES.undefined:
      case TwoLayerModel.TYPES.null:
      default:
        Handsontable.renderers.TextRenderer(...argList);
    }
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
  showOverlay (d3el, { message = '', spinner = false } = {}) {
    let overlay = d3el.select('#overlay')
      .style('display', message || spinner ? null : 'none');
    overlay.select('.message')
      .text(message);
    overlay.select('.spinner')
      .style('display', spinner ? null : 'none');
  }
  hideOverlay (d3el) {
    this.showOverlay(d3el);
  }
  showTooltip (targetBounds = {}, content = '') {
    let tooltip = this.d3el.select('#tooltip')
      .style('display', content ? null : 'none')
      .html(content);
    if (content) {
      let tooltipBounds = tooltip.node().getBoundingClientRect();
      let left = targetBounds.left ? targetBounds.left - tooltipBounds.width : 0;
      if (left < 0) {
        left = targetBounds.right;
      }
      let top = targetBounds.top ? targetBounds.top - tooltipBounds.height : 0;
      if (top < 0) {
        top = targetBounds.bottom;
      }
      tooltip.style('left', left + 'px')
        .style('top', top + 'px');
    }
  }
  hideTooltip () {
    this.showTooltip();
  }
}

export default TableView;
