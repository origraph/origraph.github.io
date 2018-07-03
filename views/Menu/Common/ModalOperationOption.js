/* globals d3 */
import ModalMenuOption from './ModalMenuOption.js';
import OperationMixin from './OperationMixin.js';

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
  async applyOperation (inputOptions) {
    const newSelection = await window.mainView.userSelection.execute(this.operation, inputOptions);
    window.mainView.setUserSelection(newSelection);
  }
}
export default ModalOperationOption;
