/* globals d3 */
import { View } from '../../lib/uki.esm.js';

class BaseMenu extends View {
  constructor (parentMenu, d3el) {
    super(d3el);
    this.parentMenu = parentMenu;
    this.requireProperties(['icon', 'label']);
  }
  getRootMenu () {
    let temp = this;
    while (temp.parentMenu) {
      temp = temp.parentMenu;
    }
    return temp;
  }
  setup () {
    this.summary.classed('menuSummary', true);
    const button = this.summary.append('div')
      .classed('button', true);
    button.append('a')
      .append('img')
      .attr('src', this.icon);
    // Label in expanded menu
    this.summary.append('label')
      .classed('menuLabel', true)
      .text(this.label);
    // Show the tooltip when the menu is collapsed
    this.summary.on('mouseover', () => {
      if (!this.getRootMenu().expanded) {
        window.mainView.showTooltip({
          content: this.label,
          targetBounds: this.summary.node().getBoundingClientRect(),
          anchor: { x: -1 }
        });
      } else {
        window.mainView.hideTooltip();
      }
    });
    this.summary.on('mouseout', () => {
      window.mainView.hideTooltip();
    });
    if (this.items) {
      let menuOptions = this.d3el.selectAll('.menuOption')
        .data(this.items, d => d);
      menuOptions = menuOptions.enter()
        .append('div')
        .classed('menuOption', true)
        .merge(menuOptions);

      menuOptions.each(function (d) {
        d.render(d3.select(this));
      });
    }
  }
  draw () {
    this.summary.select('.menuLabel')
      .style('display', this.getRootMenu().expanded ? null : 'none');
    if (this.items) {
      this.items.forEach(d => d.render());
    }
  }
}

class ActionMenuOption extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(d3el);
    this.parentMenu = parentMenu;
    this.requireProperties(['executeAction']);
  }
  setup () {
    this.summary = this.d3el;
    super.setup();
    this.summary.on('click', () => {
      this.executeAction();
    });
  }
}

class DetailsMenu extends BaseMenu {
  get expanded () {
    return this.details && this.details.node().open;
  }
  toggle () {
    if (this.details) {
      this.details.node().open = !this.details.node().open;
    }
  }
  setup () {
    this.details = this.d3el.append('details');
    this.summary = this.details.append('summary');
    super.setup();
    this.details.on('toggle', () => {
      const root = this.getRootMenu();
      if (!root.expanded) {
        root.toggle();
      }
    });
  }
}

class ModalMenuOption extends DetailsMenu {
  setup () {
    super.setup();
    this.contentDiv = this.d3el.append('div')
      .classed('menuOptionContent', true);
  }
}

export { BaseMenu, DetailsMenu, ActionMenuOption, ModalMenuOption };
