/* globals d3 */
import CollapsibleMenu from './CollapsibleMenu.js';

class SubMenu extends CollapsibleMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['items']);
  }
  toggle (state) {
    super.toggle(state);
    if (!this.expanded) {
      this.closeNestedNonSubMenus();
    }
  }
  closeNestedNonSubMenus () {
    this.items.forEach(item => {
      if (item instanceof SubMenu) {
        item.closeNestedNonSubMenus();
      } else if (item instanceof CollapsibleMenu) {
        item.toggle(false);
      }
    });
  }
  setup () {
    super.setup();
    this.d3el.append('div')
      .classed('submenu', true);
    this.d3el.append('hr');
    this.drawItems(true);
  }
  draw () {
    super.draw();
    this.d3el.selectAll(':scope > hr, :scope > .submenu')
      .style('display', this.expanded ? null : 'none');
    if (this.expanded) {
      this.drawItems();
    }
  }
  drawItems (setup = false) {
    let menuOptions = this.d3el.select(':scope > .submenu')
      .selectAll(':scope > .menuOption')
      .data(this.items, d => d.id);
    menuOptions.exit().remove();
    menuOptions = menuOptions.enter()
      .append('div')
      .classed('menuOption', true)
      .merge(menuOptions);
    menuOptions.each(function (d) {
      d.render(d3.select(this));
    });
  }
}
export default SubMenu;
