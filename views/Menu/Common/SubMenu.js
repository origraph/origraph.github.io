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
      this.items.forEach(item => {
        if (item instanceof CollapsibleMenu) {
          item.toggle(false);
        }
      });
    }
  }
  setup () {
    super.setup();
    let menuOptions = this.d3el.selectAll(':scope > .menuOption')
      .data(this.items, d => d);
    menuOptions = menuOptions.enter()
      .append('div')
      .classed('menuOption', true)
      .merge(menuOptions);

    menuOptions.each(function (d) {
      d.render(d3.select(this));
    });
    this.d3el.append('hr');
  }
  draw () {
    super.draw();
    this.d3el.selectAll(':scope > .menuOption, :scope > hr')
      .style('display', this.expanded ? null : 'none');
    if (this.expanded) {
      this.items.forEach(d => d.render());
    }
  }
}
export default SubMenu;
