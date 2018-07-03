import GoldenLayoutView from './Common/GoldenLayoutView.js';
import LocatedViewMixin from './Common/LocatedViewMixin.js';

class TableView extends LocatedViewMixin(GoldenLayoutView) {
  constructor ({ container, location }) {
    super({
      container,
      icon: TableView.icon,
      label: TableView.label,
      location
    });
    // TODO
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
