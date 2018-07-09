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
  async drawReadyState (content) {
    const [items, histograms] = await Promise.all([
      this.location.items(),
      this.location.histograms()
    ]);
    const spec = {
      data: Object.keys(items),
      colHeaders: Object.keys(histograms.attributes)
    };
    spec.columns = spec.colHeaders.map(attr => {
      return {
        data: (uniqueSelector, value) => {
          if (value) {
            mure.alert('Editing cell values is not yet supported');
          } else {
            return items[uniqueSelector].value[attr];
          }
        }
      };
    });
    this.renderer.updateSettings(spec);
    this.renderer.render();
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
