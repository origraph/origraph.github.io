import { ScrollableGoldenLayoutView, EmptyStateMixin } from './GoldenLayoutView.js';

class TableView extends EmptyStateMixin(ScrollableGoldenLayoutView) {
  constructor (container) {
    super({
      container,
      icon: TableView.icon,
      label: TableView.label
    });
    // TODO
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
