/* globals d3, mure, Handsontable */
import GoldenLayoutView from './Common/GoldenLayoutView.js';
import LocatedViewMixin from './Common/LocatedViewMixin.js';

function itemProxy (uniqueSelector) {
  return { uniqueSelector };
}

class TableView extends LocatedViewMixin(GoldenLayoutView) {
  constructor ({ container, state }) {
    super({
      container,
      icon: TableView.icon,
      label: TableView.label,
      state
    });
  }
  setup () {
    super.setup();
    this.tableDiv = this.content.append('div');
    this.renderer = new Handsontable(this.content.append('div').node(), {
      data: [],
      dataSchema: itemProxy,
      colHeaders: [],
      columns: []
    });
  }
  getTextCellSpec (valueAccessor, isSelected, special = false) {
    return {
      data: (uniqueSelector, value) => {
        if (value) {
          mure.alert('Editing cell values is not yet supported');
        } else {
          return valueAccessor(uniqueSelector);
        }
      },
      renderer: function (instance, td, row, col, prop, value, cellProperties) {
        Handsontable.renderers.TextRenderer.apply(this, arguments);
        const uniqueSelector = instance.getSourceDataAtRow(row);
        d3.select(td).classed('selected', isSelected(uniqueSelector))
          .classed('special', special);
      }
    };
  }
  async drawReadyState (content) {
    const [items, histograms, selectedItems] = await Promise.all([
      this.location.items(),
      this.location.histograms(),
      window.mainView.userSelection.items()
    ]);

    // Regular columns
    let colHeaders = Object.keys(histograms.attributes);
    let columns = colHeaders.map(attr => this.getTextCellSpec(
      d => items[d].value[attr],
      d => selectedItems[d]
    ));

    // Meta columns
    colHeaders = ['key', 'Type', 'Classes'].concat(colHeaders);
    columns = [
      this.getTextCellSpec(
        d => items[d].label,
        d => selectedItems[d],
        true
      ),
      this.getTextCellSpec(
        d => items[d].type,
        d => selectedItems[d],
        true
      ),
      this.getTextCellSpec(
        d => items[d].getClasses ? items[d].getClasses() : '',
        d => selectedItems[d],
        true
      )
    ].concat(columns);

    const spec = {
      data: Object.keys(items),
      colHeaders,
      columns
    };
    this.renderer.updateSettings(spec);
    this.renderer.render();
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
