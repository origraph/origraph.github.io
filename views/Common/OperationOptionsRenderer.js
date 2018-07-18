/* globals d3 */
class OperationOptionsRenderer {
  constructor (container, operation, selection) {
    this.container = container;
    this.operation = operation;
    this.selection = selection;
    this.inputSpec = this.operation.getInputSpec();
    this.updateChoices();
  }
  async ready () {
    return this.operation.canExecuteOnSelection(window.mainView.userSelection, this.getInputOptions());
  }
  async updateChoices () {
    await this.inputSpec.updateChoices({
      items: await window.mainView.userSelection.items(),
      inputOptions: this.getInputOptions(),
      reset: true
    });
    this.drawOptions();
  }
  drawOptions () {
    let options = this.container.selectAll(':scope > .option')
      .data(this.getOptionList(), d => d.option.parameterName);
    options.exit().remove();
    let optionsEnter = options.enter().append('div')
      .attr('data-parameter-name', d => d.option.parameterName)
      .classed('option', true);
    options = options.merge(optionsEnter);

    optionsEnter.append('label');
    options.select('label').text(d => d.option.humanReadableParameterName);

    const self = this;
    optionsEnter.each(function (d) {
      const el = d3.select(this);
      if (d.option.openEnded) {
        el.append('input')
          .attr('list', self.operation.type + d.option.parameterName)
          .classed('optionValue', true);
        el.append('datalist')
          .attr('id', self.operation.type + d.option.parameterName)
          .classed('choiceList', true);
      } else {
        el.append('select')
          .classed('optionValue', true)
          .classed('choiceList', true);
      }
    });

    let choices = options.select('.choiceList')
      .selectAll('option').data(d => d.option.choices);
    choices.exit().remove();
    let choicesEnter = choices.enter().append('option');
    choices = choices.merge(choicesEnter);
    choices.attr('value', d => (d && d.uniqueSelector) || d)
      .text(d => d === null ? 'key' : (d.label || d));

    options.select('.optionValue')
      .property('value', d => (d && d.currentValue && d.currentValue.uniqueSelector) || d.currentValue)
      .on('change', () => { this.updateChoices(); });
  }
  getOptionList () {
    let inputOptions = [];

    const helper = option => {
      const el = this.container.select(`.option[data-parameter-name="${option.parameterName}"] .optionValue`)
        .node();
      let currentValue;
      if (el) {
        if (el.tagName === 'SELECT') {
          // Get the original data object, not the string stored in the option's
          // value string
          currentValue = option.choices[el.selectedIndex];
        } else {
          currentValue = el.value;
        }
      } else {
        currentValue = option.defaultValue;
      }
      inputOptions.push({ currentValue, option });
      if (option.specs && option.specs[currentValue]) {
        Object.values(option.specs[currentValue].options).forEach(helper);
      }
    };
    Object.values(this.inputSpec.options).forEach(helper);
    return inputOptions;
  }
  getInputOptions () {
    const temp = {};
    this.getOptionList().forEach(({ currentValue, option }) => {
      temp[option.parameterName] = currentValue;
    });
    return temp;
  }
}
export default OperationOptionsRenderer;
