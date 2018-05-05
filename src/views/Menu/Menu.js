/* globals d3 */
import { View } from '../../lib/uki.esm.js';

class BaseMenu extends View {
  constructor (parentMenu, d3el) {
    super(d3el);
    this.parentMenu = parentMenu;
    this.requireProperties(['icon', 'label']);
  }
  get expanded () {
    return this.d3el && this.d3el.node().open;
  }
  toggle () {
    if (this.d3el) {
      this.d3el.node().open = !this.d3el.node().open;
    }
  }
  getRootMenu () {
    let temp = this;
    while (temp.parentMenu) {
      temp = temp.parentMenu;
    }
    return temp;
  }
  setup () {
    this.d3el.on('toggle', () => {
      const root = this.getRootMenu();
      if (!root.expanded) {
        root.toggle();
      }
    });
    this.summary = this.d3el.append('summary');
    this.summary.append('div')
      .classed('iconwrapper', true)
      .append('img')
      .attr('src', this.icon);
    this.summary.append('label')
      .text(this.label);
  }
  draw () {
    this.summary.select('label')
      .style('display', this.getRootMenu().expanded ? null : 'none');
  }
}

class Menu extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['items']);
  }
  setup () {
    super.setup();
    let menuOptions = this.d3el.selectAll('details')
      .data(this.items);
    menuOptions = menuOptions.enter().append('details')
      .merge(menuOptions);

    menuOptions.each(function (d) {
      d.render(d3.select(this));
    });
  }
  draw () {
    super.draw();
    this.items.forEach(d => d.render());
  }
}

class MenuOption extends BaseMenu {
  setup () {
    super.setup();
    this.contentDiv = this.d3el.append('div').classed('menuOptionContent', true);
  }
}

export { BaseMenu, MenuOption, Menu };
