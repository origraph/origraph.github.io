import DisableableOptionMixin from './DisableableOptionMixin.js';

export default (superclass) => class extends DisableableOptionMixin(superclass) {
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
      return window.mainView.userSelection.inferInputs(this.operation);
    }
  }
  async isEnabled () {
    return !!(await this.getInputSpec());
  }
};
