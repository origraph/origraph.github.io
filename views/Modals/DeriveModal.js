/* globals d3, origraph, CodeMirror, Handsontable */
import Modal from './Modal.js';
import PathSpecificationView from './PathSpecificationView.js';

class DeriveModal extends Modal {
  constructor (targetClass) {
    super({
      resources: {
        text: 'views/Modals/DeriveModalDocs.html'
      }
    });
    this.customStyling = true;
    this.targetClass = targetClass;
    this.pathSpecView = new PathSpecificationView(targetClass);
    this.codeTemplate = {
      func: 'Duplicate',
      attr: null
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
  setCodeContents ({ func, attr }) {
    this.codeTemplate = { func, attr };
    let codeContent = '';
    if (func === 'Count' || func === 'Mean') {
      codeContent = 'let count = 0;\n';
    } else if (func === 'Concatenate' || func === 'Median') {
      codeContent = 'let values = [];\n';
    } else if (func === 'Mode') {
      codeContent = 'let counts = {};\n';
    }
    if (func === 'Mean' || func === 'Sum') {
      codeContent += 'let total = 0;\n';
    }

    const addLoopMiddle = (classObj, indent) => {
      let result = '';
      if (func === 'Count') {
        result += `${indent}count++;`;
      }
      if (func !== 'Count') {
        if (attr === '') {
          result += `${indent}let value = ${classObj.variableName}.index;`;
        } else {
          result += `${indent}let value = ${classObj.variableName}.row['${attr}'];`;
        }
      }
      if (func === 'Mean' || func === 'Sum') {
        result += `
${indent}if (!isNaN(parseFloat(value))) {
${indent}  total += parseFloat(value);`;
        if (func === 'Mean') {
          result += `
${indent}  count++;`;
        }
        result += `
${indent}}`;
      } else if (func === 'Median' || func === 'Concatenate') {
        result += `
${indent}values.push(value);`;
      } else if (func === 'Mode') {
        result += `
${indent}counts[value] = (counts[value] || 0) + 1;`;
      }
      return result;
    };
    const addLoop = (pathIndex, indent) => {
      const classId = this.currentPath[pathIndex];
      const classObj = origraph.currentModel.classes[classId];
      const lastClassId = this.currentPath[pathIndex - 1];
      const lastClassObj = origraph.currentModel.classes[lastClassId];
      const loopIterator = `\
${lastClassObj.variableName}.${classObj.type.toLocaleLowerCase()}s({ classes: [class${pathIndex}] })`;
      const loopContents = pathIndex === this.currentPath.length - 1
        ? addLoopMiddle(classObj, indent + '  ') : addLoop(pathIndex + 1, indent + '  ');
      return `\
${indent}const class${pathIndex} = origraph.currentModel.findClass('${classObj.className}');
${indent}for await (const ${classObj.variableName} of ${loopIterator}) {
${loopContents}
${indent}}`;
    };
    if (this.currentPath.length === 1) {
      codeContent += addLoopMiddle(origraph.currentModel.classes[this.currentPath[0]], '');
    } else {
      codeContent += addLoop(1, '  ');
    }
    codeContent += '\n';

    if (func === 'Duplicate') {
      codeContent += 'return value;';
    } else if (func === 'Count') {
      codeContent += 'return count;';
    } else if (func === 'Mean') {
      codeContent += 'return total / count;';
    } else if (func === 'Sum') {
      codeContent += 'return total;';
    } else if (func === 'Concatenate') {
      codeContent += `return values.join(',');`;
    } else if (func === 'Median') {
      codeContent += `return values.sort()[Math.floor(values.length / 2)];`;
    } else if (func === 'Mode') {
      codeContent += `const sortedBins = Object.entries(counts).sort((a, b) => a[1] - b[1]).reverse();
return (sortedBins[0] || [])[0];`;
    }
    this._injectingTemplate = true;
    this.code.setValue(this.generateCodeBlock(codeContent));
    this._injectingTemplate = false;
    this.render();
  }
  setup () {
    this.d3el.classed('DeriveModal', true).html(`
      <div class="pathSpecView PathSpecificationView"></div>
      <div class="selectorView">
        <div>
          <h3>Choose an attribute</h3>
          <select id="attrSelect" size="10">
            <option value="" selected>Index</option>
            <optgroup label="Values:">
            </optgroup>
          </select>
        </div>
        <div>
          <h3>Choose a function</h3>
          <select id="funcSelect" size="10">
            <option disabled id="customFunc">Custom</option>
            <optgroup label="Single Table:">
              <option selected>Duplicate</option>
            </optgroup>
            <optgroup label="Multi-Table:" disabled>
              <option>Count</option>
              <option>Sum</option>
              <option>Mean</option>
              <option>Median</option>
              <option>Mode</option>
              <option>Concatenate</option>
            </optgroup>
          </select>
        </div>
        <div class="button"><a></a><span>Apply</span></div>
      </div>
      <div class="codeView"></div>
      <div class="docsView">${this.resources.text}</div>
      <div class="preview">
        <h3>Preview</h3>
        <div class="TableView"></div>
        <h3>Name the new attribute</h3>
        <input type="text" id="attrName" value="New Attribute"/>
      </div>
    `);
    super.setup();
    this.pathSpecView.render(this.d3el.select('.PathSpecificationView'));
    this.pathSpecView.on('pathChange', () => { this.render(); });
    this.setupButtons();
    this.setupCodeView();
    this.setupPreview();
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
    this.targetClass.table.deriveAttribute(
      this.d3el.select('#attrName').node().value,
      this.evalFunction());
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
    this.code = CodeMirror(this.d3el.select('.codeView').node(), {
      theme: 'material',
      mode: 'javascript',
      lineNumbers: true,
      value: this.generateCodeBlock(`\
// Hint: if you apply a function in Template Mode,
// it automatically replaces the contents of this
// function

// This is the default behavior (copies the index
// from the same table):
return ${this.targetClass.variableName}.index;`)
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
  setupPreview () {
    this.tableRenderer = new Handsontable(this.d3el.select('.TableView').node(), {
      data: [],
      dataSchema: index => { return { index }; }, // Fake "dataset"
      // (Handsontable can't handle our actual Wrapper objects, because they have cycles)
      columns: [],
      readOnly: true,
      stretchH: 'last',
      disableVisualSelection: true
    });

    this.d3el.select('#attrName').on('change', () => {
      this.handleNewName();
    });
  }
  handleNewName () {
    const attrDetails = this.targetClass.table.getAttributeDetails();
    const el = this.d3el.select('#attrName').node();
    const base = el.value;
    let i = '';
    while (attrDetails[base + i]) {
      i = i === '' ? 1 : i + 1;
    }
    el.value = base + i;
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
  drawPreview () {
    const func = this.evalFunction();
    const previewCell = async (element, item) => {
      if (func instanceof Error) {
        element.node().__error = func;
        element.classed('error', true)
          .text(func.constructor.name);
      } else {
        try {
          const result = await func(item);
          delete element.node().__error;
          element.classed('error', false)
            .text(result);
        } catch (err) {
          element.node().__error = err;
          element.classed('error', true)
            .text(err.constructor.name);
        }
      }
      element.on('click', function () {
        if (this.__error) {
          window.mainView.showTooltip({
            targetBounds: this.getBoundingClientRect(),
            hideAfterMs: 20000,
            content: `<p>${this.__error.message}</p>`
          });
        }
      });
    };

    const currentTable = this.targetClass.table.currentData;
    const currentKeys = Object.keys(currentTable.data);
    const cellRenderer = function (instance, td, row, col, prop, value, cellProperties) {
      Handsontable.renderers.TextRenderer.apply(this, arguments);
      const index = instance.getSourceDataAtRow(instance.toPhysicalRow(row));
      if (col === 0) {
        d3.select(td).classed('idColumn', true);
      } else {
        previewCell(d3.select(td), currentTable.data[index]);
      }
    };
    const columns = [
      {
        renderer: cellRenderer,
        data: index => index
      },
      {
        renderer: cellRenderer,
        data: index => '...'
      }
    ];
    const spec = {
      data: currentKeys,
      columns
    };
    this.tableRenderer.updateSettings(spec);
    this.tableRenderer.render();
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
    funcSelect.select('[label="Single Table:"]')
      .property('disabled', this.currentPath.length !== 1);
    funcSelect.select('[label="Multi-Table:"]')
      .property('disabled', this.currentPath.length === 1);
    // Select the appropriate option, or deselect if it's disabled
    funcSelect.node().value = this.codeTemplate ? this.codeTemplate.func
      : 'Custom';
    const selectedOption = funcSelect.node().selectedOptions[0];
    if (selectedOption && (selectedOption.disabled || selectedOption.parentNode.disabled)) {
      funcSelect.node().value = null;
    }

    // Apply button
    this.d3el.select('.selectorView .button')
      .classed('disabled', funcSelect.node().value === null)
      .on('click', () => {
        const func = funcSelect.node().value;
        if (func) {
          this.setCodeContents({
            func,
            attr: attrSelect.node().value
          });
        }
      });
  }
}

export default DeriveModal;
