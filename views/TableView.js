import GoldenLayoutView from './Common/GoldenLayoutView.js';
import LocatedViewMixin from './Common/LocatedViewMixin.js';

class TableView extends LocatedViewMixin(GoldenLayoutView) {
  constructor ({ container, state }) {
    super({
      container,
      icon: TableView.icon,
      label: TableView.label,
      state
    });
    // TODO
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
