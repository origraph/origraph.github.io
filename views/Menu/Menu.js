/* globals d3 */
import { View } from '../../node_modules/uki/dist/uki.esm.js';

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
    if (this.hideContents) {
      this.d3el.selectAll(':scope > .menuOption, :scope > hr')
        .style('display', this.expanded ? null : 'none');
      if (this.expanded) {
        this.items.forEach(d => d.render());
      }
    } else {
      this.items.forEach(d => d.render());
    }
  }
}

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

class ModalMenuOption extends CollapsibleMenu {
  setup () {
    super.setup();
    this.contentDiv = this.d3el.append('div')
      .classed('menuOptionContent', true);
    this.d3el.append('hr');
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
    this.d3el.selectAll(':scope > hr')
      .style('display', this.expanded ? null : 'none');
  }
}

class ActionMenuOption extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['executeAction']);
  }
  setup () {
    super.setup();
    this.summary.on('click', () => {
      this.executeAction();
    });
  }
}

const DisableableOptionMixin = (superclass) => class extends superclass {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['isEnabled']);
  }
  draw () {
    super.draw();
    (async () => {
      this.summary.select('.button')
        .classed('disabled', !(await this.isEnabled()));
    })();
  }
};

const OperationMixin = (superclass) => class extends DisableableOptionMixin(superclass) {
  constructor (operation, parentMenu, d3el) {
    super(parentMenu, d3el);
    this.operation = operation;
    this.icon = `img/${operation.lowerCamelCaseName}.svg`;
    this.label = operation.humanReadableName;
  }
  async isEnabled () {
    if (!window.mainView.userSelection) {
      return false;
    }
    const availableOps = await window.mainView.userSelection.getAvailableOperations();
    return !!availableOps[this.operation.name];
  }
};

class ActionOperationOption extends OperationMixin(ActionMenuOption) {
  async executeAction () {
    if (window.mainView.userSelection) {
      const newSelection = await window.mainView.userSelection.execute(this.operation);
      window.mainView.setUserSelection(newSelection);
    }
  }
}

class ModalOperationOption extends OperationMixin(ModalMenuOption) {
  draw () {
    super.draw();
    if (window.mainView.userSelection) {
      (async () => {
        const availableOps = await window.mainView.userSelection.getAvailableOperations();
        this.drawOptions(availableOps[this.operation.name]);
      })();
    }
  }
  drawOptions (inputSpec) {
    // TODO: draw settings based on the inputSpec that's given inside this.contentDiv
  }
}

class ContextualOperationOption extends ModalOperationOption {
  setup () {
    super.setup();
    const contextSwitch = this.contentDiv.append('div')
      .classed('contextSwitch', true);
    const switches = contextSwitch.selectAll('input')
      .data(d3.entries(this.operation.subOperations));
    switches.enter().append('input')
      .attr('type', 'radio')
      .text(d => d.value.humanReadableName);

    this.optionsDiv = this.contentDiv.append('div');
  }
  drawOptions (inputSpecs) {
    // TODO: draw currently active context settings in this.optionsDiv
  }
  async isEnabled () {
    if (!window.mainView.userSelection) {
      return false;
    }
    const availableOps = await window.mainView.userSelection.getAvailableOperations();
    return Object.values(availableOps[this.operation.name]).some(context => {
      return context !== null;
    });
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

const AnimatedIconMixin = (superclass) => class extends superclass {
  setup () {
    super.setup();
    this.summary.select('.button')
      .on('mouseover', () => {
        this.summary.select('.button > a > img')
          .attr('src', this.animatedIcon);
      })
      .on('mouseout', () => {
        this.summary.select('.button > a > img')
          .attr('src', this.icon);
      });
  }
};

export {
  BaseMenu,
  CollapsibleMenu,
  SubMenu,
  SortedSubMenu,
  ModalMenuOption,
  ActionMenuOption,
  DisableableOptionMixin,
  ActionOperationOption,
  ModalOperationOption,
  ContextualOperationOption,
  CheckableMenuOption,
  ViewMenuOption,
  AnimatedIconMixin
};
