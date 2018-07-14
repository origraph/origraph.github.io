import SubMenu from '../Common/SubMenu.js';
import NavigateOption from './NavigateOption.js';

class SelectMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/select.svg';
    this.label = 'Select';
    this.items = [
      new NavigateOption(this)
    ];
  }
}
export default SelectMenu;
