/* globals d3, Handsontable */
import Modal from './Modal.js';

class ConnectModal extends Modal {
  constructor (options) {
    super(options);
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
    this.d3el.html(`
      <h2 class="sourceTableLabel">${this.sourceClass.className}</h2>
      <div class="ConnectMenu">
        <div class="sourceTable"></div>
        <svg class="connections" height="5em"></svg>
        <div class="targetTable"></div>
      </div>
      <h2 class="targetTableLabel">${this.targetClass.className}</h2>
    `);
    this.sourceRenderer = this.initTable(this.d3el.select('.sourceTable'), this.sourceClass, true);
    this.targetRenderer = this.initTable(this.d3el.select('.targetTable'), this.targetClass);
    super.setup();
    // Align the buttons to the bottom instead of floating in the center
    this.d3el.select('.center')
      .classed('center', false)
      .classed('bottom', true);
  }
  draw () {
    // These empty updateSettings calls are necessary so that handsontable keeps
    // rendering rows when the user scrolls
    this.sourceRenderer.updateSettings({});
    this.sourceRenderer.render();
    this.targetRenderer.updateSettings({});
    this.targetRenderer.render();

    this.drawConnections();
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
         this.nodeAttribute === d.targetAttr.name) ||
        (this.targetClass === this.edgeClass &&
         this.edgeAttribute === d.targetAttr.name) ||
        (this.targetClass === this.otherNodeClass &&
         this.otherAttribute === this.targetAttr.name);
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
    element.text(attribute.name === null ? item.index : item.row[attribute.name]);
  }
  drawColumnHeader (element, attribute, classObj) {
    // Override handsontable's click handler
    element.on('mousedown', () => {
      d3.event.stopPropagation();
      if (classObj === this.nodeClass) {
        this.nodeAttribute = attribute.name;
      } else if (classObj === this.edgeClass) {
        this.edgeAttribute = attribute.name;
      } else if (classObj === this.otherNodeClass) {
        this.otherAttribute = attribute.name;
      }
      this.render();
    });

    const thElement = d3.select(element.node().parentNode.parentNode);

    if (classObj === this.nodeClass) {
      thElement.classed('selected', this.nodeAttribute === attribute.name);
    } else if (classObj === this.edgeClass) {
      thElement.classed('selected', this.edgeAttribute === attribute.name);
    } else if (classObj === this.otherNodeClass) {
      thElement.classed('selected', this.otherAttribute === attribute.name);
    }
  }
  initColumns (data, attrs) {
    const self = this;
    return attrs.map((attr, index) => {
      attr.columnIndex = index;
      return {
        renderer: function (instance, td, row, col, prop, value, cellProperties) {
          Handsontable.renderers.TextRenderer.apply(this, arguments);
          const index = instance.getSourceDataAtRow(row);
          self.drawCell(d3.select(td), attr, data[index]);
        },
        data: index => {
          if (attr.name === null) {
            return index;
          } else {
            const value = data[index].row[attr.name];
            if (value === undefined) {
              return '';
            } else if (typeof value === 'object') {
              return '{}';
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
    const data = classObj.table.currentData.data;
    const attrs = window.mainView.tableAttributes[classObj.classId];
    const renderer = new Handsontable(element.node(), {
      data: Object.keys(data),
      dataSchema: index => { return { index }; }, // Fake "dataset"
      // (Handsontable can't handle our actual Wrapper objects, because they have cycles)
      columns: this.initColumns(data, attrs),
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
            .style('height', '26px');
        }
        element.select('.ht_clone_top').style('top', null).style('bottom', '-4px');
      }
      element.selectAll('.ht_clone_top .colHeader .text')
        .each(function () {
          self.drawColumnHeader(d3.select(this.parentNode),
            attrs[this.dataset.columnIndex],
            classObj);
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
  ok (resolve) {
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
  cancel (resolve) {
    resolve();
  }
}

export default ConnectModal;
