import { SubMenu } from '../Menu.js';
import NavigateOption from './NavigateOption.js';
import PivotOption from './PivotOption.js';

class SelectMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/select.svg';
    this.label = 'Select';
    this.items = [
      new NavigateOption(this),
      new PivotOption(this)
    ];
  }
}
export default SelectMenu;
