/* globals d3, origraph, CodeMirror */
import Modal from './Modal.js';
import PathSpecificationView from './PathSpecificationView.js';

class FilterModal extends Modal {
  constructor (targetClass, attr) {
    super({
      resources: [{ type: 'text', url: 'docs/code.html' }]
    });
    this.customStyling = true;
    this.targetClass = targetClass;
    this.pathSpecView = new PathSpecificationView(targetClass);
    this._initiatedAttr = attr;
    this.codeTemplate = {
      func: 'Equals',
      value: 0,
      attr
    };
    this.advancedMode = false;
  }
  get currentPath () {
    return this.pathSpecView.currentPath;
  }
  generateCodeBlock (content) {
    const argName = this.targetClass.variableName;
    return `async function (${argName}) {
${content.split(/\n/g).map(d => '  ' + d).join('\n')}
}`;
  }
  setCodeContents ({ func, value, attr }) {
    this.codeTemplate = { func, value, attr };
    let codeContent = '';
    if (func.startsWith('Count')) {
      codeContent = 'let count = 0;\n';
    }

    const addLoop = (pathIndex, indent) => {
      const classId = this.currentPath[pathIndex];
      const classObj = origraph.currentModel.classes[classId];
      const lastClassId = this.currentPath[pathIndex - 1];
      const lastClassObj = origraph.currentModel.classes[lastClassId];
      const loopIterator = `\
${lastClassObj.variableName}.${classObj.type.toLocaleLowerCase()}s({ classes: [class${pathIndex}] })`;
      const loopContents = pathIndex === this.currentPath.length - 1
        ? indent + '  count++;' : addLoop(pathIndex + 1, indent + '  ');
      return `\
${indent}const class${pathIndex} = origraph.currentModel.findClass('${classObj.className}');
${indent}for await (const ${classObj.variableName} of ${loopIterator}) {
${loopContents}
${indent}}`;
    };
    if (this.currentPath.length === 1) {
      if (attr === null) {
        codeContent += `  let value = ${this.targetClass.variableName}.index;`;
      } else {
        codeContent += `  let value = await ${this.targetClass.variableName}.row['${attr}'];`;
      }
    } else {
      codeContent += addLoop(1, '  ');
    }
    codeContent += '\n';

    if (String(parseFloat(value)) !== value) {
      // Dumb check to see whether we should wrap the value in quotes
      value = "'" + value + "'";
    }

    if (func === 'Equals') {
      codeContent += `return value === ${value};`;
    } else if (func === 'Contains') {
      codeContent += `return value.indexOf(${value}) !== -1;`;
    } else if (func === 'Greater than') {
      codeContent += `return value > ${value};`;
    } else if (func === 'Less than') {
      codeContent += `return value < ${value};`;
    } else if (func === 'Count equals') {
      codeContent += `return count === ${value};`;
    } else if (func === 'Count greater than') {
      codeContent += `return count > ${value};`;
    } else if (func === 'Count less than') {
      codeContent += `return count < ${value};`;
    }
    this._injectingTemplate = true;
    this.code.setValue(this.generateCodeBlock(codeContent));
    this._injectingTemplate = false;
    this.render();
  }
  setup () {
    super.setup();
    this.d3el.classed('DeriveModal', true).select('.modalContent').html(`
      <div class="pathSpecView PathSpecificationView"></div>
      <div class="selectorView">
        <div>
          <h3>Choose a value</h3>
          <select id="attrSelect" size="10">
            <option value="" selected>Index</option>
            <optgroup label="Attributes:">
            </optgroup>
          </select>
        </div>
        <div>
          <h3>Choose a function</h3>
          <select id="funcSelect" size="10">
            <option disabled id="customFunc">Custom</option>
            <optgroup label="In-class:">
              <option selected>Equals</option>
              <option>Contains</option>
              <option>Greater than</option>
              <option>Less than</option>
            </optgroup>
            <optgroup label="Across Classes:" disabled>
              <option>Count equals</option>
              <option>Count greater than</option>
              <option>Count less than</option>
            </optgroup>
          </select>
        </div>
        <div>
          <h3>Filter value</h3>
          <input id="filterValue" value="0"/>
        </div>
      </div>
      <div class="codeView"></div>
      <div class="docsView">${this.resources[0]}</div>
      <div class="preview">
        <h3>Preview</h3>
        <div><span id="filterCount"></span> Filtered</div>
        <div><span id="remainingCount"></span> Remaining</div>
        <details id="errorMessage" style="display:none">
          <summary></summary>
          <div id="errorContents"></div>
        </details>
      </div>
    `);
    this.pathSpecView.render(this.d3el.select('.PathSpecificationView'));
    this.pathSpecView.on('pathChange', () => {
      this._forceTemplateUpdate = true;
      this.render();
    });
    this.setupButtons();
    this.setupCodeView();
  }
  draw () {
    this.d3el.selectAll('.PathSpecificationView,.selectorView')
      .style('display', this.advancedMode ? 'none' : null);
    this.d3el.selectAll('.codeView,.docsView')
      .style('display', this.advancedMode ? null : 'none');
    this.drawPreview();
    this.drawButtons();
    if (this.advancedMode) {
      this.drawCodeView();
    } else {
      this.pathSpecView.render();
      this.drawSelectorView();
    }
  }
  ok (resolve) {
    this.targetClass.table.addFilter(
      this.evalFunction(),
      // Store the function on the attribute where the filter was initiated
      // if the user has written some custom code
      this.codeTemplate ? this.codeTemplate.attr : this._initiatedAttr);
    resolve(true);
  }
  cancel (resolve) {
    resolve();
  }
  setupButtons () {
    // Add a button for toggling mode
    const toggleButton = this.d3el.select('.dialogButtons')
      .append('div')
      .classed('button', true)
      .attr('id', 'modeButton')
      .lower();
    toggleButton.append('a');
    toggleButton.append('span');
    toggleButton.on('click', () => {
      this.advancedMode = !this.advancedMode;
      this.render();
    });
  }
  drawButtons () {
    this.d3el.select('#modeButton > span')
      .text(this.advancedMode ? 'Template Mode' : 'Advanced Mode');
  }
  setupCodeView () {
    const attrBit = this.codeTemplate.attr === null ? `${this.targetClass.variableName}.index`
      : `await ${this.targetClass.variableName}.row['${this.codeTemplate.attr}']`;
    this.code = CodeMirror(this.d3el.select('.codeView').node(), {
      theme: 'material',
      mode: 'javascript',
      lineNumbers: true,
      value: this.generateCodeBlock(`\
// Hint: if you apply a function in Template Mode, it automatically
// replaces the contents of this function

// This is the default behavior:
return ${attrBit} === 0;`)
    });
    // Don't allow the user to edit the first or last lines
    this.code.on('beforeChange', (cm, change) => {
      if (!this._injectingTemplate &&
        (change.from.line === 0 || change.to.line === cm.lastLine())) {
        change.cancel();
      }
    });
    this.code.on('changes', () => {
      if (!this._injectingTemplate) {
        this.codeTemplate = null;
        this.render();
      }
    });
  }
  drawCodeView () {
    this.code.refresh();
  }
  evalFunction () {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    let codeContents = this.code.getValue().split('\n');
    codeContents = codeContents.slice(1, codeContents.length - 1).join('\n');
    try {
      return new AsyncFunction(this.targetClass.variableName, codeContents);
    } catch (err) {
      return err;
    }
  }
  async drawPreview () {
    window.clearTimeout(this._previewInterval);
    const func = this.evalFunction();
    const errorMessage = this.d3el.select('#errorMessage');
    if (func instanceof Error) {
      errorMessage.style('display', null);
      errorMessage.select('summary').text(func.constructor.name);
      errorMessage.select('#errorContents').text(func.message);
      this.d3el.selectAll('#filterCount, #remainingCount').text('--');
    } else {
      try {
        errorMessage.style('display', 'none');
        let keep = 0;
        let reject = 0;
        const previewIter = this.targetClass.table.iterate();
        this._previewInterval = window.setInterval(async () => {
          for (let i = 0; i < 30; i++) { // preview in batches of 30
            const { done, value } = await previewIter.next();
            if (done) {
              window.clearTimeout(this._previewInterval);
              break;
            } else {
              if (await func(value) === true) {
                keep++;
              } else {
                reject++;
              }
            }
          }
          this.d3el.select('#filterCount').text(reject);
          this.d3el.select('#remainingCount').text(keep);
        }, 0);
      } catch (err) {
        errorMessage.style('display', null);
        errorMessage.select('summary').text(err.constructor.name);
        errorMessage.select('#errorContents').text(err.message);
        this.d3el.selectAll('#filterCount, #remainingCount').text('--');
      }
    }
  }
  drawSelectorView () {
    // Attribute select menu
    const attrSelect = this.d3el.select('#attrSelect');

    // Update the Index option
    attrSelect.select('[value=""]')
      .property('selected', this.codeTemplate && this.codeTemplate.attr === null);

    // Update the list of attributes
    const attrList = d3.entries(origraph.currentModel
      .classes[this.pathSpecView.currentClassId].table.getAttributeDetails());
    let attrs = attrSelect.select('optgroup').selectAll('option')
      .data(attrList, ({ key }) => key);
    attrs.exit().remove();
    const attrsEnter = attrs.enter().append('option');
    attrs = attrsEnter.merge(attrs);
    attrs.text(({ key }) => key)
      .property('selected', ({ key }) => this.codeTemplate && this.codeTemplate.attr === key);

    // Function select menu
    const funcSelect = this.d3el.select('#funcSelect');
    // Enable / disable sections based on what currentPath and codeTemplate are
    funcSelect.select('#customFunc')
      .property('disabled', !!this.codeTemplate);
    funcSelect.select('[label="In-class:"]')
      .property('disabled', this.currentPath.length !== 1);
    funcSelect.select('[label="Across Classes:"]')
      .property('disabled', this.currentPath.length === 1);
    // Select the appropriate option, or deselect if it's disabled
    funcSelect.node().value = this.codeTemplate ? this.codeTemplate.func
      : 'Custom';
    const selectedOption = funcSelect.node().selectedOptions[0];
    if (selectedOption && (selectedOption.disabled || selectedOption.parentNode.disabled)) {
      funcSelect.node().value = null;
    }

    // Filter value
    const filterValue = this.d3el.select('#filterValue')
      .property('disabled', !this.codeTemplate);
    filterValue.node().value = this.codeTemplate ? this.codeTemplate.value : '';

    if (this._forceTemplateUpdate) {
      delete this._forceTemplateUpdate;
      this.handleTemplateChange();
    }

    // Apply changes whenever either select menu or filterValue is changed
    const updateContents = () => {
      clearTimeout(this._updateContentsTimeout);
      this.handleTemplateChange();
    };
    this.d3el.selectAll('#attrSelect, #funcSelect, #filterValue')
      .on('change', updateContents);
    filterValue.on('keyup', () => {
      clearTimeout(this._updateContentsTimeout);
      this._updateContentsTimeout = setTimeout(updateContents, 1000);
    });
  }
  handleTemplateChange () {
    const func = this.d3el.select('#funcSelect').node().value;
    if (func) {
      this.setCodeContents({
        func,
        value: this.d3el.select('#filterValue').node().value,
        attr: this.d3el.select('#attrSelect').node().value || null
      });
    }
    this.render();
  }
}

export default FilterModal;
