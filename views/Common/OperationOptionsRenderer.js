/* globals d3 */
class OperationOptionsRenderer {
  constructor (container, operation, selection) {
    this.container = container;
    this.operation = operation;
    this.selection = selection;
    this.inputSpec = this.operation.getInputSpec();
    (async () => {
      await this.inputSpec.populateChoicesFromSelection(window.mainView.userSelection);
      this.drawOptions();
    })();
  }
  async ready () {
    return this.operation.canExecuteOnSelection(window.mainView.userSelection, this.getInputOptions());
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
      if (d.openEnded) {
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
    let choicesEnter = choices.enter().append('option');
    choices = choices.merge(choicesEnter);
    choices.attr('value', d => d)
      .text(d => d);

    options.select('.optionValue')
      .property('value', d => d.currentValue);
  }
  getOptionList () {
    let inputOptions = [];
    Object.entries(this.inputSpec.options).forEach(([opName, option]) => {
      let el = this.container.select(`.option[data-parameter-name="${option.parameterName}] .optionValue"`);
      inputOptions.push({
        currentValue: el.size() > 0 ? el.node().value : option.defaultValue,
        option
      });
    });
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
