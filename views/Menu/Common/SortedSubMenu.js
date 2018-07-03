import SubMenu from './SubMenu.js';

class SortedSubMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['compare']);
  }
  draw () {
    if (this.expanded) {
      this.d3el.selectAll(':scope > .menuOption')
        .sort((a, b) => this.compare(a, b));
    }
    super.draw();
  }
}
export default SortedSubMenu;
