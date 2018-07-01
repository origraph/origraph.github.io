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
  async getInputSpec () {
    if (!window.mainView.userSelection) {
      return null;
    } else {
      const availableOps = await window.mainView.userSelection.getAvailableOperations();
      return availableOps[this.operation.name];
    }
  }
  async isEnabled () {
    return !!(await this.getInputSpec());
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
  setup () {
    super.setup();
    this.applyButton = this.contentDiv.append('div')
      .classed('button', true);
    this.applyButton.append('a');
    this.applyButton.append('span').text('Apply');
  }
  draw () {
    super.draw();
    this.drawOptions();
  }
  async drawOptions (containerDiv = this.contentDiv) {
    containerDiv.html('');
    const inputSpec = await this.getInputSpec();
    const self = this;

    let options = containerDiv.selectAll('.option')
      .data(inputSpec ? d3.entries(inputSpec.options) : [], d => d.key);
    options.exit().remove();
    let optionsEnter = options.enter().append('div')
      .classed('option', true)
      .each(function (d) {
        if (d.value.constructor.name === 'ItemRequirement') {
          self.setupItemRequirement(d3.select(this), d.value);
        } else if (d.value.constructor.name === 'ToggleInputOption') {
          self.setupToggleInputOption(d3.select(this), d.value);
        } else if (d.value.constructor.name === 'ValueInputOption') {
          self.setupValueInputOption(d3.select(this), d.value);
        } // Ignore generic InputOptions; those are for coding contexts only
      });
    options = options.merge(optionsEnter);

    options.each(function (d) {
      if (d.value.constructor.name === 'ItemRequirement') {
        self.drawItemRequirement(d3.select(this), d.value);
      } else if (d.value.constructor.name === 'ToggleInputOption') {
        self.drawToggleInputOption(d3.select(this), d.value);
      } else if (d.value.constructor.name === 'ValueInputOption') {
        self.drawValueInputOption(d3.select(this), d.value);
      } // Ignore generic InputOptions; those are for coding contexts only
    });

    this.applyButton
      .classed('disabled', !inputSpec)
      .raise()
      .on('click', () => {
        if (inputSpec) {
          let settings = {};
          options.each(function (d) {
            if (d.value.constructor.name === 'ItemRequirement') {
              settings[d.value.name] = self.getItemRequirement(d3.select(this), d.value);
            } else if (d.value.constructor.name === 'ToggleInputOption') {
              settings[d.value.name] = self.getToggleInputOption(d3.select(this), d.value);
            } else if (d.value.constructor.name === 'ValueInputOption') {
              settings[d.value.name] = self.getValueInputOption(d3.select(this), d.value);
            } // Ignore generic InputOptions; those are for coding contexts only
          });
          this.applyOperation(settings);
          window.mainView.render();
        }
      });
  }
  setupToggleInputOption (containerDiv, option) {
    containerDiv.append('fieldset').append('legend').text(option.name);
  }
  drawToggleInputOption (containerDiv, option) {
    let radios = containerDiv.select('fieldset').selectAll('.radio')
      .data(option.choices, d => d);
    radios.exit().remove();
    let radiosEnter = radios.enter().append('div')
      .classed('radio', true);
    radios = radios.merge(radiosEnter);

    radiosEnter.append('input')
      .attr('type', 'radio')
      .attr('name', this.operation.name + option.name)
      .property('value', d => d)
      .text(d => d);
    radiosEnter.append('label');
    radios.select('label').text(d => d);
  }
  getToggleInputOption (containerDiv, option) {
    return containerDiv.select('.radios').selectAll('.radio')
      .filter(function () { return this.checked; })
      .node().value;
  }
  setupValueInputOption (containerDiv, option) {
    containerDiv.append('label').text(option.name);
    containerDiv.append('input')
      .attr('list', this.operation.name + option.name);
    containerDiv.append('datalist')
      .attr('id', this.operation.name + option.name);
  }
  drawValueInputOption (containerDiv, option) {
    let options = containerDiv.select('datalist').selectAll('option')
      .data(option.suggestions, d => d);
    options.exit().remove();
    options = options.merge(options.enter().append('option'));

    options.attr('value', d => d);
  }
  getValueInputOption (containerDiv, option) {
    return containerDiv.select('input').node().value;
  }
  setupItemRequirement (containerDiv, option) {
    containerDiv.append('label').text(option.name);
    containerDiv.append('select');
  }
  drawItemRequirement (containerDiv, option) {
    const eligibleItems = [
      {
        key: null,
        value: {
          label: `Selected ${option.ItemType.getHumanReadableType()} items:`,
          disabled: true
        }
      },
      ...d3.entries(option.eligibleItems)
    ];
    let options = containerDiv.select('select').selectAll('option')
      .data(eligibleItems);
    options.exit().remove();
    options = options.merge(options.enter().append('option'));

    options.property('disabled', d => d.value.disabled)
      .attr('value', d => d.key)
      .text(d => d.value.label);
  }
  getItemRequirement (containerDiv, option) {
    const key = containerDiv.select('select').node().value;
    return key ? option.eligibleItems[key] : null;
  }
  async applyOperation (inputOptions) {
    const newSelection = await window.mainView.userSelection.execute(this.operation, inputOptions);
    window.mainView.setUserSelection(newSelection);
  }
}

class ContextualOperationOption extends ModalOperationOption {
  constructor (operation, parentMenu, d3el) {
    super(operation, parentMenu, d3el);
    this.currentOperation = Object.keys(operation.subOperations)[0];
  }
  async getInputSpec () {
    const specs = await super.getInputSpec();
    return specs ? specs[this.currentOperation] : null;
  }
  setup () {
    super.setup();
    const contextSwitchContainer = this.contentDiv.append('div');
    const switches = contextSwitchContainer.selectAll('div.contextSwitch')
      .data(d3.entries(this.operation.subOperations));
    const switchesEnter = switches.enter().append('label')
      .classed('contextSwitch', true);
    switchesEnter.append('input')
      .attr('type', 'radio')
      .attr('value', d => d.value.name)
      .attr('name', this.operation.name)
      .on('change', async d => {
        this.currentOperation = d.key;
        this.drawOptions();
      });
    switchesEnter.append('span')
      .text(d => d.value.humanReadableName);

    this.optionsDiv = this.contentDiv.append('div');
  }
  draw () {
    super.draw();
    if (window.mainView.userSelection) {
      (async () => {
        const availableOps = await window.mainView.userSelection.getAvailableOperations();
        const switches = this.contentDiv.selectAll('.contextSwitch');
        switches
          .property('selected', d => d.value.name === this.currentOperation)
          .classed('disabled', d => !availableOps[this.operation.name][d.key])
          .select('input')
          .property('disabled', d => !availableOps[this.operation.name][d.key]);
      })();
    }
  }
  async drawOptions () {
    return super.drawOptions(this.optionsDiv);
  }
  async applyOperation (inputOptions) {
    inputOptions.context = this.currentOperation;
    return super.applyOperation(inputOptions);
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
