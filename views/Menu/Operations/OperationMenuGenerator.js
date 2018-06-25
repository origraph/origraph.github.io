import { SortedSubMenu, ModalMenuOption, ActionMenuOption } from '../Menu.js';

class OperationModalOption extends ModalMenuOption {
  setup (d3el) {
    super.setup(d3el);
    this.contentDiv.text('todo: operation modal');
  }
}

export default (icon, opFamilyName, opFamilyObj) => class extends SortedSubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = icon;
    this.label = opFamilyName;
    this.items = Object.entries(opFamilyObj)
      .map(([opName, operation]) => {
        let menuOption;
        if (operation.acceptsInputOptions) {
          menuOption = new OperationModalOption(this);
          menuOption.operation = operation;
        } else {
          menuOption = new ActionMenuOption(this);
          menuOption.executeAction = async () => {
            window.mainView.setUserSelection(await window.mainView.userSelection.execute(operation));
          };
        }
        menuOption.icon = `img/${opName}.svg`;
        menuOption.label = opName;
        Object.defineProperty(menuOption, 'enabled', {
          get: () => {
            return !!(window.mainView.availableOperations &&
              window.mainView.availableOperations[opFamilyName][opName]);
          }
        });
        return menuOption;
      });
  }
  draw () {
    super.draw();
    this.d3el.select('.button')
      .classed('disabled', !window.mainView.availableOperations ||
        !window.mainView.availableOperations[this.label] ||
        Object.keys(window.mainView.availableOperations[this.label]).length === 0);
  }
  compare (a, b) {
    if (a.enabled && !b.enabled) {
      // a is enabled and b isn't; it should come first
      return -1;
    } else if (b.enabled && !a.enabled) {
      return 1;
    } else {
      // default: sort alphabetically
      return a.label < b.label ? -1 : 1;
    }
  }
};
