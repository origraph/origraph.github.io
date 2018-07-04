import DisableableOptionMixin from './DisableableOptionMixin.js';

export default (superclass) => class extends DisableableOptionMixin(superclass) {
  constructor (operation, parentMenu, d3el) {
    super(parentMenu, d3el);
    this.operation = operation;
    this.icon = `img/${operation.lowerCamelCaseName}.svg`;
    this.label = operation.humanReadableName;
  }
  setup () {
    super.setup();
    this.optionsDiv = this.contentDiv.append('div');
    this.applyButton = this.contentDiv.append('div')
      .classed('button', true);
    this.applyButton.append('a');
    this.applyButton.append('span').text('Apply');
  }
  async isEnabled () {
    if (!window.mainView.userSelection) {
      return false;
    }
    const specOrSpecs = await window.mainView.userSelection.inferInputs(this.operation);
    if (this.operation.subOperations) {
      return Object.values(specOrSpecs).some(spec => !!spec);
    } else {
      return !!specOrSpecs;
    }
  }
};
