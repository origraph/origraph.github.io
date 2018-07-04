/* globals d3 */
class OperationOptionsRenderer {
  constructor (container, operation, selection) {
    this.container = container;
    this.operation = operation;
    if (this.operation.subOperations) {
      this.currentOperation = Object.keys(this.operation.subOperations)[0];
    }
    this.selection = selection;
  }
  async getInputSpec () {
    let op = this.operation;
    if (this.operation.subOperations) {
      op = this.operation.subOperations[this.currentOperation];
    }
    return this.selection.inferInputs(op);
  }
  async ready () {
    const settings = await this.getSettings();
    if (!settings) { return false; }
    return Object.values(settings).every(setting => !!setting);
  }
  drawContextSwitch () {
    let switchContainer = this.container.select('.contextSwitches');
    if (switchContainer.size() === 0) {
      switchContainer = this.container.append('div')
        .classed('contextSwitches', true);
    }
    let switches = switchContainer.selectAll('.switch')
      .data(d3.entries(this.operation.subOperations));
    switches.exit().remove();
    const switchesEnter = switches.enter().append('label')
      .classed('switch', true);
    switches = switches.merge(switchesEnter);

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
    (async () => {
      const allSpecs = await this.selection.inferInputs(this.operation);
      switches.classed('disabled', d => !allSpecs[d.key])
        .select('input')
        .property('checked', d => d.value.name === this.currentOperation)
        .property('disabled', d => !allSpecs[d.key]);
    })();
  }
  async drawOptions () {
    const self = this;
    if (this.operation.subOperations) {
      this.drawContextSwitch();
    }
    const inputSpec = await this.getInputSpec();
    let options = this.container.selectAll(':scope > .option')
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
    this.rendered = true;
  }
  async getSettings () {
    const inputSpec = await this.getInputSpec();
    if (inputSpec && this.rendered) {
      let settings = {
        operation: this.operation.subOperations
          ? this.operation.subOperations[this.currentOperation] : this.operation,
        parameters: {}
      };
      const self = this;
      this.container.selectAll(':scope > .option').each(function (d) {
        if (d.value.constructor.name === 'ItemRequirement') {
          settings.parameters[d.value.name] = self.getItemRequirement(d3.select(this), d.value);
        } else if (d.value.constructor.name === 'ToggleInputOption') {
          settings.parameters[d.value.name] = self.getToggleInputOption(d3.select(this), d.value);
        } else if (d.value.constructor.name === 'ValueInputOption') {
          settings.parameters[d.value.name] = self.getValueInputOption(d3.select(this), d.value);
        } // Ignore generic InputOptions; those are for coding contexts only
      });
      return settings;
    } else {
      return null;
    }
  }
  setupToggleInputOption (containerDiv, option) {
    containerDiv.append('fieldset')
      .classed(option.name, true)
      .append('legend').text(option.name);
  }
  drawToggleInputOption (containerDiv, option) {
    let radios = containerDiv.select(`.${option.name}`)
      .selectAll('.radio')
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
    return containerDiv.select(`.${option.name}`)
      .selectAll('input[type="radio"]')
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
}
export default OperationOptionsRenderer;
