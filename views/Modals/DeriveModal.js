/* globals d3, origraph, CodeMirror, Handsontable */
import Modal from './Modal.js';

const NODE_RADIUS = 20;
const NODE_PADDING = 50;
const LABEL_PADDING = 15;

const EDGE_THICKNESS = NODE_RADIUS / 5;
const NODE_OUTLINES = {
  // Circle for node classes
  'Node': `\
M0,${-NODE_RADIUS}\
A${NODE_RADIUS},${NODE_RADIUS},0,1,1,0,${NODE_RADIUS}\
A${NODE_RADIUS},${NODE_RADIUS},0,1,1,0,${-NODE_RADIUS}`,
  // Rectangles for edge classes
  'Edge': `\
M${-EDGE_THICKNESS},${-NODE_RADIUS}\
L${-EDGE_THICKNESS},${NODE_RADIUS}\
L${EDGE_THICKNESS},${NODE_RADIUS}\
L${EDGE_THICKNESS},${-NODE_RADIUS}\
Z`
};

class DeriveModal extends Modal {
  constructor (targetClass) {
    super({
      resources: {
        text: 'views/Modals/DeriveModalDocs.html'
      }
    });
    this.customStyling = true;
    this.targetClass = targetClass;
    this.computeLayout();
    this.currentPath = [this.targetClass.classId];
    this.codeTemplate = {
      func: 'Duplicate',
      attr: null
    };
    this.advancedMode = false;
  }
  computeLayout () {
    this.allClasses = [];
    this.classLookup = {};
    this.layers = {};
    this.layerLookup = {};
    this.connections = [];

    const queue = [{
      parentIndex: 0,
      layerNumber: 0,
      classObj: this.targetClass
    }];
    const links = {};

    while (queue.length > 0) {
      let { parentIndex, layerNumber, classObj } = queue.shift();
      if (this.classLookup[classObj.classId] !== undefined) {
        continue;
      }

      this.classLookup[classObj.classId] = this.allClasses.length;
      this.allClasses.push(classObj);
      const layer = this.layers[layerNumber] = this.layers[layerNumber] || [];
      while (layer.length < parentIndex - 1) {
        // dummy nodes to ensure that children always progress from their parent
        layer.push(null);
      }
      this.layerLookup[classObj.classId] = { layerNumber, index: layer.length };
      layer.push(classObj.classId);

      layerNumber++;
      parentIndex = layer.length;
      if (classObj.type === 'Node') {
        for (const edgeClass of classObj.edgeClasses()) {
          if (!links[edgeClass.classId] || !links[edgeClass.classId][classObj.classId]) {
            links[classObj.classId] = links[classObj.classId] || {};
            links[classObj.classId][edgeClass.classId] = true;
          }
          queue.push({
            parentIndex,
            layerNumber,
            classObj: edgeClass
          });
        }
      } else if (classObj.type === 'Edge') {
        const sourceClass = classObj.sourceClass;
        if (sourceClass) {
          if (!links[sourceClass.classId] || !links[sourceClass.classId][classObj.classId]) {
            links[classObj.classId] = links[classObj.classId] || {};
            links[classObj.classId][sourceClass.classId] = true;
          }
          queue.push({
            parentIndex,
            layerNumber,
            classObj: sourceClass
          });
        }
        const targetClass = classObj.targetClass;
        if (targetClass) {
          if (!links[targetClass.classId] || !links[targetClass.classId][classObj.classId]) {
            links[classObj.classId] = links[classObj.classId] || {};
            links[classObj.classId][targetClass.classId] = true;
          }
          queue.push({
            parentIndex,
            layerNumber,
            classObj: targetClass
          });
        }
      }

      for (const [ sourceId, targetIds ] of Object.entries(links)) {
        for (const targetId of Object.keys(targetIds)) {
          this.connections.push({
            source: sourceId,
            target: targetId
          });
        }
      }
    }
  }
  shortestPath (sourceId, targetId) {
    const visited = {};
    const queue = [[sourceId]];
    while (queue.length > 0) {
      const path = queue.shift();
      const classId = path[path.length - 1];
      if (classId === targetId) {
        return path;
      } else if (visited[classId]) {
        continue;
      }
      visited[classId] = true;
      const classObj = origraph.currentModel.classes[classId];
      if (classObj.type === 'Node') {
        for (const edgeClass of classObj.edgeClasses()) {
          queue.push(path.concat([edgeClass.classId]));
        }
      } else if (classObj.type === 'Edge') {
        if (classObj.sourceClassId) {
          queue.push(path.concat([classObj.sourceClassId]));
        }
        if (classObj.targetClassId) {
          queue.push(path.concat([classObj.targetClassId]));
        }
      }
    }
    return null;
  }
  addClassIdToPath (classId) {
    const nextSeries = this.shortestPath(this.currentClassId, classId);
    if (nextSeries === null) {
      throw new Error(`Can't find route to unconnected classId: ${classId}`);
    }
    this.currentPath = this.currentPath.concat(nextSeries.slice(1, nextSeries.length));
    this.render();
  }
  get currentClassId () {
    return this.currentPath[this.currentPath.length - 1];
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
      codeContent += `return values[Math.floor(values.length / 2)];`;
    } else if (func === 'Mode') {
      codeContent += `return d3.max(d3.entries(counts), d => d.value).key;`;
    }
    this._injectingTemplate = true;
    this.code.setValue(this.generateCodeBlock(codeContent));
    this._injectingTemplate = false;
    this.render();
  }
  setup () {
    this.d3el.classed('DeriveModal', true).html(`
      <div class="pathView">
        <h3>Choose a path</h3>
        <div class="breadcrumb"></div>
        <div class="modelView">
          <svg>
            <g class="lightLinkLayer"></g>
            <g class="activeLinkLayer"></g>
            <g class="classLayer"></g>
          </svg>
        </div>
      </div>
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
    this.setupButtons();
    this.setupCodeView();
    this.setupPreview();
  }
  draw () {
    this.d3el.selectAll('.pathView,.selectorView')
      .style('display', this.advancedMode ? 'none' : null);
    this.d3el.selectAll('.codeView,.docsView')
      .style('display', this.advancedMode ? null : 'none');
    this.drawPreview();
    this.drawButtons();
    if (this.advancedMode) {
      this.drawCodeView();
    } else {
      this.drawModelView();
      this.drawBreadcrumb();
      this.drawSelectorView();
    }
  }
  ok (resolve) {
    // TODO
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
  drawPreview () {
    let error = false;
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    let codeContents = this.code.getValue().split('\n');
    codeContents = codeContents.slice(1, codeContents.length - 1).join('\n');
    let func;
    try {
      func = new AsyncFunction(this.targetClass.variableName, codeContents);
    } catch (err) {
      error = err;
    }
    const previewCell = async (element, item) => {
      if (error) {
        element.node().__error = error;
        element.classed('error', true)
          .text(error.constructor.name);
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
  drawModelView () {
    // Compute SVG size
    const svg = this.d3el.select('.modelView svg');
    const width = NODE_PADDING + (NODE_PADDING + 2 * NODE_RADIUS) *
      Math.max(...Object.values(this.layers).map(layer => layer.length));
    const height = NODE_PADDING + (NODE_PADDING + 2 * NODE_RADIUS) *
      Object.values(this.layers).length;
    svg.attr('width', width)
      .attr('height', height);

    // Helper values / functions
    const transition = d3.transition().duration(400);
    const computeClassCenter = classId => {
      return {
        y: (NODE_PADDING + 2 * NODE_RADIUS) *
          this.layerLookup[classId].layerNumber +
          NODE_PADDING + NODE_RADIUS,
        x: (NODE_PADDING + 2 * NODE_RADIUS) *
          this.layerLookup[classId].index +
          NODE_PADDING + NODE_RADIUS
      };
    };
    const computeClassTransform = classObj => {
      const { x, y } = computeClassCenter(classObj.classId);
      return `translate(${x},${y})`;
    };
    const computeLinkPath = link => {
      const source = computeClassCenter(link.source);
      source.y += NODE_RADIUS;
      const target = computeClassCenter(link.target);
      target.y -= NODE_RADIUS;
      return `M${source.x},${source.y}L${target.x},${target.y}`;
    };

    // Init classes
    let classes = svg.select('.classLayer').selectAll('.class')
      .data(this.allClasses, classObj => classObj.classId);
    classes.exit().remove();
    const classesEnter = classes.enter().append('g')
      .classed('class', true);
    classes = classesEnter.merge(classes);

    // Set up class interaction
    classes.on('click', classObj => {
      this.addClassIdToPath(classObj.classId);
    });

    // Position classes
    classesEnter.attr('transform', computeClassTransform);
    classes.transition(transition).attr('transform', computeClassTransform);

    // Draw classes
    classes.classed('active', classObj => this.currentPath.indexOf(classObj.classId) !== -1)
      .classed('focused', classObj => this.currentClassId === classObj.classId);

    classesEnter.append('path');
    classes.select('path')
      .attr('d', classObj => NODE_OUTLINES[classObj.type])
      .attr('fill', classObj => `#${classObj.annotations.color}`);

    classesEnter.append('text');
    classes.select('text')
      .attr('y', classObj => {
        if (this.layerLookup[classObj.classId].index % 2 === 0) {
          return NODE_RADIUS + LABEL_PADDING;
        } else {
          return -NODE_RADIUS - LABEL_PADDING / 2;
        }
      })
      .attr('text-anchor', 'middle')
      .text(classObj => classObj.className);

    // Init light links
    let lightLinks = svg.select('.lightLinkLayer').selectAll('.link')
      .data(this.connections, d => d.source + '>' + d.target);
    lightLinks.exit().remove();
    const lightLinksEnter = lightLinks.enter().append('path')
      .classed('link', true);
    lightLinks = lightLinksEnter.merge(lightLinks);

    // Position light links
    lightLinksEnter.attr('d', computeLinkPath);
    lightLinks.transition(transition).attr('d', computeLinkPath);

    // Init active links
    const activeLinkList = this.connections.filter(link => {
      return this.currentPath.indexOf(link.source) !== -1 &&
        this.currentPath.indexOf(link.target) !== -1;
    });
    let activeLinks = svg.select('.activeLinkLayer').selectAll('.link')
      .data(activeLinkList, d => d.source + '>' + d.target);
    activeLinks.exit().attr('opacity', 1)
      .transition(transition)
      .attr('opacity', 0)
      .remove();
    const activeLinksEnter = activeLinks.enter().append('path')
      .classed('link', true);
    activeLinksEnter.attr('opacity', 0)
      .transition(transition)
      .attr('opacity', 1);
    activeLinks = activeLinksEnter.merge(activeLinks);

    // Position active links
    activeLinksEnter.attr('d', computeLinkPath);
    activeLinks.transition(transition).attr('d', computeLinkPath);
  }
  drawBreadcrumb () {
    // Draw class chunks
    let classes = this.d3el.select('.breadcrumb').selectAll('.class')
      .data(this.currentPath, classId => classId);
    classes.exit().remove();
    const classesEnter = classes.enter().append('div').classed('class', true);
    classes = classesEnter.merge(classes);

    // Class labels
    classesEnter.append('div').classed('className', true);
    classes.select('.className')
      .text(classId => origraph.currentModel.classes[classId].className)
      .style('color', classId => {
        return `#${origraph.currentModel.classes[classId].annotations.color}`;
      }).on('click', (classId, index) => {
        this.currentPath.splice(index + 1);
        this.render();
      });

    // Breadcrumb separator
    classesEnter.append('div').classed('separator', true)
      .text('>');
  }
  drawSelectorView () {
    // Attribute select menu
    const attrSelect = this.d3el.select('#attrSelect');

    // Update the Index option
    attrSelect.select('[value=""]')
      .property('selected', this.codeTemplate && this.codeTemplate.attr === null);

    // Update the list of attributes
    const attrList = d3.entries(origraph.currentModel
      .classes[this.currentClassId].table.getAttributeDetails());
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
