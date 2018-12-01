/* globals d3, Handsontable */
import Modal from './Modal.js';
import PathSpecificationView from './PathSpecificationView.js';

class ConnectModal extends Modal {
  constructor (options) {
    super(options);
    this.customStyling = true;
    this.side = options.side;
    this.sourceClass = options.sourceClass;
    this.targetClass = options.targetClass;
    this.nodeClass = options.nodeClass;
    this.edgeClass = options.edgeClass;
    this.otherNodeClass = options.otherNodeClass;
    this.nodeAttribute = null;
    this.edgeAttribute = null;
    this.otherAttribute = null;
    this.initPairwiseConnectionCounts();
    this.pathSpecView = new PathSpecificationView(this.nodeClass);
  }
  initPairwiseConnectionCounts () {
    this._pairwiseConnectionCounts = [];
    const sourceAttrs = window.mainView.tableAttributes[this.sourceClass.classId];
    const targetAttrs = window.mainView.tableAttributes[this.targetClass.classId];
    for (const sourceAttr of sourceAttrs) {
      for (const targetAttr of targetAttrs) {
        // TODO: count how many matches there would be for each pair
        this._pairwiseConnectionCounts.push({
          sourceAttr,
          targetAttr,
          count: 1
        });
      }
    }
  }
  setup () {
    this.d3el.classed('ConnectModal', true).html(`
      <div class="shortcutView PathSpecificationView"></div>
      <div class="matchView">
        <h3 class="sourceTableLabel">${this.sourceClass.className}</h3>
        <div class="ConnectMenu">
          <div class="sourceTable TableView"></div>
          <svg class="connections" height="5em"></svg>
          <div class="targetTable TableView"></div>
        </div>
        <h3 class="targetTableLabel">${this.targetClass.className}</h3>
      </div>
    `);
    super.setup();
    this.sourceRenderer = this.initTable(this.d3el.select('.sourceTable'), this.sourceClass, true);
    this.targetRenderer = this.initTable(this.d3el.select('.targetTable'), this.targetClass);
    this.pathSpecView.render(this.d3el.select('.PathSpecificationView'));
    this.pathSpecView.on('pathChange', () => { this.render(); });
    this.setupButtons();
  }
  draw () {
    this.d3el.select('.PathSpecificationView')
      .style('display', this.shortcutMode ? null : 'none');
    this.d3el.select('.matchView')
      .style('display', this.shortcutMode ? 'none' : null);

    this.drawButtons();
    if (this.shortcutMode) {
      this.pathSpecView.render();
    } else {
      this.sourceRenderer.updateSettings({
        data: Object.keys(this.sourceClass.table.currentData.lookup)
      });
      this.targetRenderer.updateSettings({
        data: Object.keys(this.targetClass.table.currentData.lookup)
      });

      this.drawConnections();
    }
  }
  ok (resolve) {
    if (this.shortcutMode) {
      throw new Error(`unimplemented`);
    } else {
      if (this.edgeClass) {
        resolve(this.edgeClass.connectToNodeClass({
          nodeClass: this.nodeClass,
          side: this.side,
          nodeAttribute: this.nodeAttribute,
          edgeAttribute: this.edgeAttribute
        }));
      } else {
        resolve(this.nodeClass.connectToNodeClass({
          otherNodeClass: this.otherNodeClass,
          attribute: this.nodeAttribute,
          otherAttribute: this.otherAttribute
        }));
      }
    }
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
      this.shortcutMode = !this.shortcutMode;
      this.render();
    });
  }
  drawButtons () {
    this.d3el.select('#modeButton > span')
      .text(this.shortcutMode ? 'Attribute Mode' : 'Shortcut Mode');
  }
  drawConnections () {
    // Update the svg size, and figure out its CSS placement on the screen
    const svg = this.d3el.select('.connections');
    svg.attr('width', this.d3el.select('.sourceTable').node()
      .getBoundingClientRect().width);
    const svgBounds = svg.node().getBoundingClientRect();

    // Draw the lines in the connection view
    let connections = svg.selectAll('path')
      .data(this._pairwiseConnectionCounts);
    connections.exit().remove();
    const connectionsEnter = connections.enter().append('path');
    connections = connections.merge(connectionsEnter);

    connections.classed('selected', d => {
      const sourceSelected =
        (this.sourceClass === this.nodeClass &&
         this.nodeAttribute === d.sourceAttr.name) ||
        (this.sourceClass === this.edgeClass &&
         this.edgeAttribute === d.sourceAttr.name);
      const targetSelected =
        (this.targetClass === this.nodeClass &&
         this.sourceClass !== this.otherNodeClass &&
         this.nodeAttribute === d.targetAttr.name) ||
        (this.targetClass === this.edgeClass &&
         this.edgeAttribute === d.targetAttr.name) ||
        (this.targetClass === this.otherNodeClass &&
         this.otherAttribute === d.targetAttr.name);
      return sourceSelected && targetSelected;
    });

    connections.attr('d', d => {
      const sourceHeader = this.d3el.selectAll('.sourceTable .ht_clone_top .htCore tr th')
        .filter(function (d2, i) {
          return d.sourceAttr.name === this.textContent ||
            (d.sourceAttr.name === null && i === 0);
        }).node();
      const targetHeader = this.d3el.selectAll('.targetTable .ht_clone_top .htCore tr th')
        .filter(function (d2, i) {
          return d.targetAttr.name === this.textContent ||
            (d.targetAttr.name === null && i === 0);
        }).node();
      if (!sourceHeader || !targetHeader) {
        return '';
      }
      const sourceBounds = sourceHeader.getBoundingClientRect();
      const targetBounds = targetHeader.getBoundingClientRect();
      const coords = {};
      coords.sx = coords.scx = sourceBounds.left + sourceBounds.width / 2 - svgBounds.left;
      coords.tx = coords.tcx = targetBounds.left + targetBounds.width / 2 - svgBounds.left;
      coords.sy = 0;
      coords.scy = svgBounds.height / 3;
      coords.ty = svgBounds.height;
      coords.tcy = 2 * svgBounds.height / 3;
      return `\
M${coords.sx},${coords.sy}\
C${coords.scx},${coords.scy}\
,${coords.tcx},${coords.tcy}\
,${coords.tx},${coords.ty}`;
    });
  }
  drawCell (element, attribute, item) {
    element.classed('idColumn', attribute.name === null);
    if (attribute.name !== null && item.row[attribute.name] instanceof Promise) {
      (async () => {
        const value = await item.row[attribute.name];
        element.select('.cellWrapper').text(value);
      })();
    }
  }
  drawColumnHeader (element, attribute, classObj, isSource) {
    if (attribute.name === null) {
      element.html('&nbsp;');
    }

    // Override handsontable's click handler
    element.on('mousedown', () => {
      d3.event.stopPropagation();
      if (isSource) {
        if (classObj === this.nodeClass && this.nodeClass === this.sourceClass) {
          this.nodeAttribute = attribute.name;
        } else if (classObj === this.edgeClass && this.edgeClass === this.sourceClass) {
          this.edgeAttribute = attribute.name;
        }
      } else {
        if (classObj === this.otherNodeClass && this.otherNodeClass === this.targetClass) {
          this.otherAttribute = attribute.name;
        } else if (classObj === this.nodeClass && this.nodeClass === this.targetClass) {
          this.nodeAttribute = attribute.name;
        } else if (classObj === this.edgeClass && this.edgeClass === this.targetClass) {
          this.edgeAttribute = attribute.name;
        }
      }
      this.render();
    });

    const thElement = d3.select(element.node().parentNode.parentNode)
      .classed('idColumn', attribute.name === null);

    if (isSource) {
      if (classObj === this.nodeClass && this.nodeClass === this.sourceClass) {
        thElement.classed('selected', this.nodeAttribute === attribute.name);
      } else if (classObj === this.edgeClass && this.edgeClass === this.sourceClass) {
        thElement.classed('selected', this.edgeAttribute === attribute.name);
      }
    } else {
      if (classObj === this.otherNodeClass && this.otherNodeClass === this.targetClass) {
        thElement.classed('selected', this.otherAttribute === attribute.name);
      } else if (classObj === this.nodeClass && this.nodeClass === this.targetClass) {
        thElement.classed('selected', this.nodeAttribute === attribute.name);
      } else if (classObj === this.edgeClass && this.edgeClass === this.targetClass) {
        thElement.classed('selected', this.edgeAttribute === attribute.name);
      }
    }
  }
  initColumns (classObj, attrs) {
    const self = this;
    return attrs.map((attr, index) => {
      attr.columnIndex = index;
      return {
        renderer: function (instance, td, row, col, prop, value, cellProperties) {
          Handsontable.renderers.TextRenderer.apply(this, arguments);
          td = d3.select(td);
          const temp = td.html();
          td.html(`<div class="cellWrapper">${temp}</div>`);
          const index = instance.getSourceDataAtRow(row);
          const dataValue = classObj.table.currentData.data[classObj.table.currentData.lookup[index]];
          if (dataValue !== undefined) {
            self.drawCell(td, attr, dataValue);
          }
        },
        data: index => {
          if (attr.name === null) {
            return index;
          } else {
            const rowIndex = classObj.table.currentData.lookup[index];
            const value = classObj.table.currentData.data[rowIndex].row[attr.name];
            if (value instanceof Promise) {
              return '...';
            } else {
              return value;
            }
          }
        }
      };
    });
  }
  initHeaders (attrs) {
    return (columnIndex) => {
      const attribute = attrs[columnIndex];
      let name = attribute.name;
      if (attribute.name === null) {
        name = '';
      }
      return `<div class="text" data-column-index=${columnIndex}>${name}</div>`;
    };
  }
  initTable (element, classObj, headersOnBottom = false) {
    const self = this;
    classObj.table.on('cacheBuilt', () => { this.render(); });
    const attrs = window.mainView.tableAttributes[classObj.classId];
    const renderer = new Handsontable(element.node(), {
      data: Object.keys(classObj.table.currentData.lookup),
      dataSchema: index => { return { index }; }, // Fake "dataset"
      // (Handsontable can't handle our actual Wrapper objects, because they have cycles)
      columns: this.initColumns(classObj, attrs),
      colHeaders: this.initHeaders(attrs),
      manualColumnResize: true,
      readOnly: true,
      preventOverflow: 'horizontal',
      disableVisualSelection: true
    });
    renderer.addHook('afterRender', () => {
      if (headersOnBottom) {
        // Sneaky hacks to put the headers on bottom
        element.select('.ht_master .htCore > thead').style('display', 'none');
        if (element.select('.ht_master .htCore .bottomHeaderGap').size() === 0) {
          element.select('.ht_master .htCore').append('div')
            .classed('bottomHeaderGap', true)
            .style('height', '25px');
        }
        element.select('.ht_clone_top').style('top', null).style('bottom', '-6px');
      }
      element.selectAll('.ht_clone_top .colHeader .text')
        .each(function () {
          self.drawColumnHeader(d3.select(this.parentNode),
            attrs[this.dataset.columnIndex],
            classObj,
            headersOnBottom);
        });
    });
    renderer.addHook('afterColumnResize', () => {
      this.drawConnections();
    });
    renderer.addHook('afterScrollHorizontally', () => {
      this.drawConnections();
    });
    return renderer;
  }
}

export default ConnectModal;
