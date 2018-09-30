/* globals d3, Handsontable */
import Modal from './Modal.js';

class ConnectModal extends Modal {
  constructor (options) {
    super(options);
    this.sourceClass = options.sourceClass;
    this.targetClass = options.targetClass;
    this.nodeClass = options.nodeClass;
    this.edgeClass = options.edgeClass;
    this.otherNodeClass = options.otherNodeClass;
    this.nodeAttribute = null;
    this.edgeAttribute = null;
  }
  setup () {
    this.d3el.html(`
      <h2>Match values between these attributes to create connections:</h2>
      <div class="ConnectMenu">
        <div class="sourceTable"></div>
        <svg class="connections" width="${window.innerWidth}px" height="3em"></svg>
        <div class="targetTable"></div>
      </div>
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
  }
  drawCell (element, attribute, item) {
    element.text(attribute.name === null ? item.index : item.row[attribute.name]);
  }
  drawColumnHeader (element, attribute) {
    // Override handsontable's click handler
    element.on('mousedown', () => {
      d3.event.stopPropagation();
    });
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
      const name = attribute.name === null ? 'ID' : attribute.name;
      return `<div class="text" data-column-index=${columnIndex}>${name}</div>`;
    };
  }
  initTable (element, classObj, headersOnBottom = false) {
    const self = this;
    const data = classObj.table.currentData.data;
    const attrs = Object.values(classObj.table.getAttributeDetails());
    attrs.unshift(classObj.table.getIndexDetails());
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
          self.drawColumnHeader(d3.select(this.parentNode), attrs[this.dataset.columnIndex]);
        });
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
        otherAttribute: this.edgeAttribute
      }));
    }
  }
  cancel (resolve) {
    resolve();
  }
}

export default ConnectModal;
