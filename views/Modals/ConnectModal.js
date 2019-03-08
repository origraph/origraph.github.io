/* globals origraph, d3, Handsontable */
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
    this._stats = [];
    this._sourceAttribute = undefined;
    this._targetAttribute = undefined;
    this.pathSpecView = new PathSpecificationView(this.nodeClass);
  }
  async initStats () {
    this.startedStats = true;
    const statWorker = new window.Worker('views/Modals/ConnectModalStatWorker.js');
    statWorker.onmessage = stat => {
      this._sortedStats = false;
      if (stat === 'done') {
        this.finishedStats = true;
      } else {
        this._stats.push(JSON.parse(stat));
      }
      this.render();
    };
    const sourceCounts = await this.sourceClass.countAllUniqueValues();
    const targetCounts = await this.targetClass.countAllUniqueValues();
    statWorker.postMessage([JSON.stringify(sourceCounts), JSON.stringify(targetCounts)]);
    this.render();
  }
  get bestStat () {
    if (!this._sortedStats) {
      // Pick the pair of attributes with the highest match to miss ratio
      this._stats.sort((a, b) => {
        return (a.matches / (a.sourceDistribution[0] + a.targetDistribution[0])) -
          (b.matches / (b.sourceDistribution[0] + b.targetDistribution[0]));
      });
      this._sortedStats = true;
    }
    return this._stats[this._stats.length - 1];
  }
  get sourceAttribute () {
    if (this._sourceAttribute !== undefined) {
      return this._sourceAttribute;
    } else {
      return this.bestStat ? this.bestStat.sourceAttr : null;
    }
  }
  get targetAttribute () {
    if (this._targetAttribute !== undefined) {
      return this._targetAttribute;
    } else {
      return this.bestStat ? this.bestStat.targetAttr : null;
    }
  }
  get projectionPathIsValid () {
    const currentPath = this.pathSpecView.currentPath;
    const lastClass = origraph.currentModel.classes[currentPath[currentPath.length - 1]];
    return currentPath.length > 2 && this.pathSpecView.targetClass.type === 'Node' &&
      lastClass.type === 'Node';
  }
  setup () {
    this.d3el.classed('ConnectModal', true).html(`
      <div class="edgeProjectionView PathSpecificationView"></div>
      <div class="attributeColumnsView">
        <div>
          <h3>Match when equivalent:</h3>
          <label>${this.sourceClass.className}</label>
          <select id="sourceSelect" size="10"></select>
          <label>${this.targetClass.className}</label>
          <select id="targetSelect" size="10"></select>
        </div>
        <div>
          <div class="sourceDistribution"></div>
          <div class="targetDistribution"></div>
          <div class="scatterplot"></div>
        </div>
        <div class="matchView">
          <h3 class="sourceTableLabel">${this.sourceClass.className}</h3>
          <div class="ConnectMenu">
            <div class="sourceTable TableView"></div>
            <svg class="connections" height="5em"></svg>
            <div class="targetTable TableView"></div>
          </div>
          <h3 class="targetTableLabel">${this.targetClass.className}</h3>
        </div>
      </div>
    `);
    super.setup();
    this.setupStatViews();
    this.sourceRenderer = this.initTable(this.d3el.select('.sourceTable'), this.sourceClass, true);
    this.targetRenderer = this.initTable(this.d3el.select('.targetTable'), this.targetClass);
    this.pathSpecView.render(this.d3el.select('.PathSpecificationView'));
    this.pathSpecView.on('pathChange', () => { this.render(); });
    this.setupButtons();
  }
  draw () {
    this.d3el.select('.edgeProjectionView')
      .style('display', this.edgeProjectionMode ? null : 'none');
    this.d3el.select('.attributeColumnsView')
      .style('display', this.edgeProjectionMode ? 'none' : null);

    this.drawButtons();
    if (this.edgeProjectionMode) {
      this.pathSpecView.render();
    } else {
      this.drawStatViews();
      this.sourceRenderer.updateSettings({
        data: Object.keys(this.sourceClass.table.currentData.lookup)
      });
      this.targetRenderer.updateSettings({
        data: Object.keys(this.targetClass.table.currentData.lookup)
      });
      this.drawConnections();
    }

    // Wait to draw at least once before attempting to compute stats (so the
    // interface doesn't pause in a pre-draw state during the
    // sort-of-expensive, but worker-incompatible countAllUniqueValues calls)
    if (!this.startedStats) {
      setTimeout(() => {
        this.initStats();
      }, 100);
    }
  }
  ok (resolve) {
    if (this.edgeProjectionMode) {
      if (this.projectionPathIsValid) {
        resolve(this.pathSpecView.targetClass.projectNewEdge(this.pathSpecView.currentPath.slice(1)));
      }
    } else {
      if (this.edgeClass) {
        resolve(this.edgeClass.connectToNodeClass({
          nodeClass: this.nodeClass,
          side: this.side,
          nodeAttribute: this.sourceClass === this.edgeClass ? this.targetAttribute : this.sourceAttribute,
          edgeAttribute: this.sourceClass === this.edgeClass ? this.sourceAttribute : this.targetAttribute
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
      this.edgeProjectionMode = !this.edgeProjectionMode;
      this.render();
    });
  }
  setupStatViews () {
    // TODO: populate select menu
    this.d3el.select('.sourceDistribution').text('TODO: source distribution');
    this.d3el.select('.targetDistribution').text('TODO: target distribution');
    this.d3el.select('.scatterplot').text('TODO: scatterplot');
  }
  drawStatViews () {
    // throw new Error('unimplemented');
  }
  drawButtons () {
    this.d3el.select('#modeButton > span')
      .text(this.edgeProjectionMode ? 'Attribute Mode' : 'Edge Projection Mode');
    this.d3el.select('.ok.button')
      .classed('disabled', this.edgeProjectionMode && !this.projectionPathIsValid);
  }
  drawConnections () {
    // Update the svg size, and figure out its CSS placement on the screen
    const svg = this.d3el.select('.connections');
    svg.attr('width', this.d3el.select('.sourceTable').node()
      .getBoundingClientRect().width);
    const svgBounds = svg.node().getBoundingClientRect();

    // If the currently selected pair of attributes don't have stats yet, create
    // a fake one
    const selectedIndex = this._stats.findIndex(stat => {
      return stat.sourceAttr === this.sourceAttribute &&
        stat.targetAttr === this.targetAttribute;
    });
    const statList = selectedIndex !== -1 ? this._stats : [{
      sourceAttr: this.sourceAttribute,
      targetAttr: this.targetAttribute
    }].concat(this._stats);

    // Draw the lines in the connection view
    let connections = svg.selectAll('path').data(statList);
    connections.exit().remove();
    const connectionsEnter = connections.enter().append('path');
    connections = connections.merge(connectionsEnter);

    connections.classed('selected', d => {
      return d.sourceAttr === this.sourceAttribute &&
        d.targetAttr === this.targetAttribute;
    });

    connections.attr('d', d => {
      const sourceHeader = this.d3el.selectAll('.sourceTable .ht_clone_top .htCore tr th')
        .filter(function (d2, i) {
          return d.sourceAttr === this.textContent ||
            (d.sourceAttr === null && i === 0);
        }).node();
      const targetHeader = this.d3el.selectAll('.targetTable .ht_clone_top .htCore tr th')
        .filter(function (d2, i) {
          return d.targetAttr === this.textContent ||
            (d.targetAttr === null && i === 0);
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
        this._sourceAttribute = attribute.name;
      } else {
        this._targetAttribute = attribute.name;
      }
      this.render();
    });

    const thElement = d3.select(element.node().parentNode.parentNode)
      .classed('idColumn', attribute.name === null);

    if (isSource) {
      thElement.classed('selected', this.sourceAttribute === attribute.name);
    } else {
      thElement.classed('selected', this.targetAttribute === attribute.name);
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
      data: [], // Object.keys(classObj.table.currentData.lookup),
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
