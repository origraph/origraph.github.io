import SubMenu from '../Common/SubMenu.js';

class SubViewMenu extends SubMenu {
  constructor ({
    parentMenu,
    items,
    icon,
    label,
    d3el
  }) {
    super(parentMenu, d3el);
    this.icon = icon;
    this.label = label;
    this.items = items;
  }
}
export default SubViewMenu;
