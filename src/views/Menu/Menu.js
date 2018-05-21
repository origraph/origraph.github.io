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
    this.summary = this.d3el.append('div')
      .classed('menuSummary', true);
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
  }
  draw () {
    this.summary.select('.menuLabel')
      .style('display', this.getRootMenu().expanded ? null : 'none');
  }
}

class CollapsibleMenu extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.expanded = false;
  }
  toggle (state = !this.expanded) {
    this.expanded = state;
    this.render();
  }
  setup () {
    super.setup();
    this.summary.on('click', () => {
      this.toggle();
    });
  }
  draw () {
    super.draw();
    this.summary.select('.button')
      .classed('selected', this.expanded);
  }
}

class SubMenu extends CollapsibleMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['items']);
    this.hideContents = true;
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
  draw () {
    super.draw();
    if (this.hideContents) {
      this.d3el.selectAll('.menuOption')
        .style('display', this.expanded ? null : 'none');
      if (this.expanded) {
        this.items.forEach(d => d.render());
      }
    } else {
      this.items.forEach(d => d.render());
    }
  }
}

class ModalMenuOption extends CollapsibleMenu {
  setup () {
    super.setup();
    this.contentDiv = this.d3el.append('div')
      .classed('menuOptionContent', true);
  }
  toggle (state) {
    super.toggle(state);
    if (this.expanded && !this.getRootMenu().expanded) {
      this.getRootMenu().toggle(true);
    }
  }
  draw () {
    super.draw();
    this.contentDiv.style('display', this.expanded ? null : 'none');
  }
}

class ActionMenuOption extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['executeAction', 'enabled']);
  }
  setup () {
    super.setup();
    this.summary.on('click', () => {
      this.executeAction();
    });
  }
  draw () {
    this.summary.select('.button')
      .classed('disabled', !this.enabled);
  }
}

class CheckableMenuOption extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['checked', 'toggle']);
  }
  setup () {
    super.setup();
    this.summary.append('img')
      .classed('checkmark', true)
      .attr('src', 'img/check.svg');
    this.summary.on('click', () => {
      this.toggle();
    });
  }
  draw () {
    super.draw();
    this.summary.select('.button')
      .classed('selected', this.checked);
    this.summary.select('.checkmark')
      .style('display', this.checked && this.getRootMenu().expanded ? null : 'none');
  }
}

class ViewMenuOption extends CheckableMenuOption {
  constructor (className, parentMenu, d3el) {
    super(parentMenu, d3el);
    this.className = className;
    this.icon = window.mainView.VIEW_CLASSES[className].icon;
    this.label = window.mainView.VIEW_CLASSES[className].label;
  }
  get checked () {
    return window.mainView.isShowingSubView(this.className);
  }
  toggle (state) {
    window.mainView.toggleSubView(this.className);
  }
}

export {
  BaseMenu,
  CollapsibleMenu,
  SubMenu,
  ModalMenuOption,
  ActionMenuOption,
  CheckableMenuOption,
  ViewMenuOption
};
