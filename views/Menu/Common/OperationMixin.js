import DisableableOptionMixin from './DisableableOptionMixin.js';

export default (superclass) => class extends DisableableOptionMixin(superclass) {
  constructor (operation, parentMenu, d3el) {
    super(parentMenu, d3el);
    this.operation = operation;
    this.icon = `img/${operation.lowerCamelCaseType}.svg`;
    this.label = operation.humanReadableType;
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
    return this.operation.potentiallyExecutableOnSelection(window.mainView.userSelection);
  }
};
