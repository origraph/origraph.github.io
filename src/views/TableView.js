import GoldenLayoutView from './GoldenLayoutView.js';

class TableView extends GoldenLayoutView {
  constructor (container) {
    super(container, TableView.icon, TableView.label);
    // TODO
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
