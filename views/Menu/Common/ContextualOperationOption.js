/* globals d3 */
import ModalOperationOption from './ModalOperationOption.js';

class ContextualOperationOption extends ModalOperationOption {
  constructor (operation, parentMenu, d3el) {
    super(operation, parentMenu, d3el);
    this.currentOperation = Object.keys(operation.subOperations)[0].name;
  }
  async getInputSpecs () {
    return super.getInputSpec();
  }
  async getInputSpec () {
    const specs = await this.getInputSpecs();
    return specs ? (specs[this.currentOperation] || null) : null;
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
        const specs = await this.getInputSpecs();
        const switches = this.contentDiv.selectAll('.contextSwitch');
        switches
          .property('checked', d => d.value.name === this.currentOperation)
          .classed('disabled', d => !specs[d.key])
          .select('input')
          .property('disabled', d => !specs[d.key]);
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
    const specs = await this.getInputSpecs();
    return specs && Object.values(specs).some(context => {
      return context !== null;
    });
  }
}
export default ContextualOperationOption;
