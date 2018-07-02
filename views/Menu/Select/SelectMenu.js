import { SubMenu } from '../Menu.js';
import PivotOption from './PivotOption.js';

class SelectMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/select.svg';
    this.label = 'Select';
    this.items = [
      new PivotOption(this)
    ];
  }
}
export default SelectMenu;
