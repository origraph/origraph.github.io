import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

class TableView extends ScrollableGoldenLayoutView {
  constructor (container) {
    super(container, TableView.icon, TableView.label);
    // TODO
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
