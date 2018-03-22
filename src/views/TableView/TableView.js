/* globals Handsontable */
import { View } from '../../lib/uki.esm.js';

class TableView extends View {
  constructor (d3el, twoLayerModel) {
    super(d3el, {
      style: 'views/TableView/style.css',
      text: 'views/TableView/template.html'
    });

    this.setModel(twoLayerModel);

    Handsontable.renderers.registerRenderer('generic',
      (...args) => { this.drawCell(...args); });
  }
  setModel (twoLayerModel) {
    this.model = twoLayerModel;
    this.model.on('update', () => { this.render(); });
    this.render();
  }
  setup (d3el) {
    d3el.html(this.resources.text);
  }
  async draw (d3el) {
    if (this.model.isLoading) {
      this.showMessage(d3el, 'Loading tables...');
      this.showSpinner(d3el);
    } else if (this.model.entities.length === 0) {
      this.showMessage(d3el, 'No data selected');
      this.hideSpinner(d3el);
    } else {
      this.hideMessage(d3el);
      this.showSpinner(d3el);
      await this.drawTables(d3el);
      this.hideSpinner(d3el);
    }
  }
  async drawTables (d3el) {
    if (!this.handsontables) {
      this.handsontables = {};
    }

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
      .selectAll('.chunk').data(d => d.path);
    breadcrumbChunks.exit().remove();
    let breadcrumbChunksEnter = breadcrumbChunks.enter().append('div')
      .classed('chunk', true);
    breadcrumbChunks = breadcrumbChunks.merge(breadcrumbChunksEnter);

    breadcrumbChunks.text(d => d);

    // TODO: Main table section
    tablesEnter.append('div').classed('mainTable', true);
    let self = this;
    tables.select('.mainTable').each(function (d) {
      let settings;
      let table = self.model.getTable(d.id);
      if (table) {
        settings = {
          data: table.data,
          rowHeaders: table.rows,
          colHeaders: table.columns,
          columns: table.columns.map(d => { return { renderer: 'generic' }; })
        };
      } else {
        let vector = self.model.getVector(d.id);
        let rows = Object.keys(vector);
        settings = {
          data: rows.map(attr => vector[attr]),
          rowHeaders: rows,
          colHeaders: ['value'],
          columns: [{ renderer: 'generic' }]
        };
      }

      if (!self.handsontables[d.id]) {
        self.handsontables[d.id] = new Handsontable(this, settings);
      } else {
        self.handsontables[d.id].updateSettings(settings);
      }
    });
  }
  drawCell (hotInstance, td, row, column, prop, value, cellProperties) {
    // Apply the classes that enable default selection, etc
    Handsontable.renderers.BaseRenderer(
      hotInstance, td, row, column, prop, value, cellProperties);
    console.log(arguments);
  }
  showMessage (d3el, message) {
    d3el.select('#message')
      .style('display', null)
      .select('.center')
      .text(message);
  }
  hideMessage (d3el) {
    d3el.select('#message')
      .style('display', 'none');
  }
  showSpinner (d3el) {
    d3el.select('#spinner')
      .style('display', null);
  }
  hideSpinner (d3el) {
    d3el.select('#spinner')
      .style('display', 'none');
  }
}

export default TableView;
