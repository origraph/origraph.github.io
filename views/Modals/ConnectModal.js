/* globals origraph, d3, Handsontable */
import Modal from './Modal.js';
import PathSpecificationView from './PathSpecificationView.js';

const MAX_SUMMARY_BINS = 10;

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
    statWorker.onmessage = message => {
      this._sortedStats = false;
      if (message.data === 'done') {
        this.finishedStats = true;
      } else {
        const stat = JSON.parse(message.data);
        stat.sourceSummary = this.summarizeDistribution(stat.sourceDistribution);
        stat.targetSummary = this.summarizeDistribution(stat.targetDistribution);
        this._stats.push(stat);
      }
      this.render();
    };
    const sourceCounts = await this.sourceClass.countAllUniqueValues();
    const targetCounts = await this.targetClass.countAllUniqueValues();
    statWorker.postMessage([JSON.stringify(sourceCounts), JSON.stringify(targetCounts)]);
    this.render();
  }
  summarizeDistribution (distribution) {
    // Compute a summary of the distribution, because we really only care about
    // how many things have exactly zero connections; exactly one connection; or
    // many connections
    const sourceBins = Object.keys(distribution).map(d => +d);
    if (sourceBins.length > MAX_SUMMARY_BINS) {
      const result = {};
      if (distribution[0]) {
        result[0] = distribution[0];
      }
      if (distribution[1]) {
        result[1] = distribution[1];
      }
      const extent = d3.extent(sourceBins.filter(d => d > 1));
      const interval = (extent[1] - extent[0]) / (MAX_SUMMARY_BINS - Object.keys(result).length);
      for (let i = extent[0]; i < extent[1]; i += interval) {
        const bottom = Math.floor(i);
        let top = Math.floor(i + interval) - 1;
        top = Math.max(bottom, top);
        let key = top === bottom ? bottom : `${bottom}-${top}`;
        result[key] = 0;
        for (let j = bottom; j <= top; j++) {
          result[key] += distribution[j] || 0;
        }
      }
      return result;
    } else {
      return distribution;
    }
  }
  get bestStat () {
    if (!this._sortedStats) {
      // Pick the pair of attributes with the highest combined heuristic score
      this._stats.sort((a, b) => (b.sourceOneToOneNess + b.targetOneToOneNess) -
        (a.sourceOneToOneNess + a.targetOneToOneNess));
      this._sortedStats = true;
    }
    return this._stats[0];
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
          <h3 style="color:#${this.sourceClass.annotations.color}">${this.sourceClass.className}</h3>
          <select id="sourceSelect" size="10">
            <option value="" selected>Index</option>
            <optgroup label="Attributes:">
            </optgroup>
          </select>
          <p>Connect when values are equivalent</p>
          <h3 style="color:#${this.targetClass.annotations.color}">${this.targetClass.className}</h3>
          <select id="targetSelect" size="10">
            <option value="" selected>Index</option>
            <optgroup label="Attributes:">
            </optgroup>
          </select>
        </div>
        <div class="statSummaries">
          <div class="sourceDistribution"></div>
          <div class="scatterplot"></div>
          <div class="targetDistribution"></div>
          <div class="spinner"></div>
        </div>
        <div class="matchView">
          <div class="ConnectMenu">
            <svg class="connections" height="calc(5em + 17px)"></svg>
            <div class="sourceTable TableView"></div>
            <div class="targetTable TableView"></div>
          </div>
        </div>
      </div>
    `);
    super.setup();
    this.setupAttributeMenu('source');
    this.setupAttributeMenu('target');
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
      this.updateSelectMenu(this.d3el.select('#sourceSelect'), this.sourceAttribute);
      this.updateSelectMenu(this.d3el.select('#targetSelect'), this.targetAttribute);
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
  setupAttributeMenu (menuString) { // menuString is 'source' or 'target'
    const classObj = this[menuString + 'Class'];
    const selectMenu = this.d3el.select(`#${menuString}Select`);
    // Update the list of attributes
    const attrList = d3.entries(classObj.table.getAttributeDetails());
    let attrs = selectMenu.select('optgroup').selectAll('option')
      .data(attrList, ({ key }) => key);
    attrs.exit().remove();
    const attrsEnter = attrs.enter().append('option');
    attrs = attrsEnter.merge(attrs);
    attrs.text(({ key }) => key);

    selectMenu.on('change', () => {
      this[`_${menuString}Attribute`] = selectMenu.node().value || null;
      this.render();
    });
  }
  updateSelectMenu (selectMenu, attribute) {
    selectMenu.node().value = attribute === null ? '' : attribute;
  }
  setupStatViews () {
    const barChartBoilerplate = `
      <svg>
        <g class="chart"></g>
        <g class="x axis"></g>
        <g class="y axis"></g>
        <text class="x label" text-anchor="middle"></text>
        <text class="y label" text-anchor="middle" transform="rotate(-90)"></text>
      </svg>`;
    this.d3el.select('.sourceDistribution').html(barChartBoilerplate);
    this.d3el.select('.targetDistribution').html(barChartBoilerplate);
    this.d3el.select('.scatterplot').html(`
      <svg>
        <g class="x axis"></g>
        <g class="y axis"></g>
        <g class="chart"></g>
        <circle class="helpBubble" r="0.5em"></circle>
        <text class="x label" text-anchor="middle">One-to-one Cardinality<tspan class="helpMark" dx="0.5em">?</tspan></text>
        <text class="y label" text-anchor="middle" transform="rotate(-90)">Total Connections</text>
      </svg>`);
    this.d3el.select('.scatterplot .helpBubble')
      .on('mouseenter', function () {
        window.mainView.showTooltip({
          content: `<p>This is a heuristic for how close a pair of attributes gets<br/>
                       to a one-to-one relationship.</p>
                    <p>The value is a count of one for every item in both classes,<br/>
                       divided by the number of that item's connections (or a<br/>
                       count of minus one for items that have no connections)</p>`,
          targetBounds: this.getBoundingClientRect(),
          hideAfterMs: 60000
        });
      }).on('mouseleave', () => {
        window.mainView.hideTooltip();
      });
  }
  drawStatViews () {
    const statSummaries = this.d3el.select('.statSummaries');
    const bounds = statSummaries.node().getBoundingClientRect();
    const margin = { top: 20, right: 20, bottom: 40, left: 70 };
    const width = bounds.width - (margin.left + margin.right);
    const height = (bounds.height / 3) - (margin.top + margin.bottom);
    const charts = statSummaries.selectAll('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    charts.select('.chart')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    charts.select('.x.axis')
      .attr('transform', `translate(${margin.left},${height + margin.top})`);
    charts.select('.y.axis')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    let currentStat = this._stats.filter(stat => {
      return stat.sourceAttr === this.sourceAttribute &&
        stat.targetAttr === this.targetAttribute;
    })[0];
    statSummaries.select('.spinner')
      .style('display', currentStat ? 'none' : null);
    if (!currentStat) {
      currentStat = {
        matches: 0,
        sourceAttr: null,
        targetAttr: null,
        sourceDistribution: { 0: 0 },
        targetDistribution: { 0: 0 },
        sourceSummary: { 0: 0 },
        targetSummary: { 0: 0 },
        sourceOneToOneNess: 0,
        targetOneToOneNess: 0
      };
    }
    this.drawBarChart(statSummaries.select('.sourceDistribution'), this.sourceClass, currentStat.sourceSummary, width, height, margin);
    this.drawBarChart(statSummaries.select('.targetDistribution'), this.targetClass, currentStat.targetSummary, width, height, margin);
    this.drawScatterplot(statSummaries.select('.scatterplot'), width, height, margin);
  }
  drawBarChart (container, classObj, distribution, width, height, margin) {
    const bins = Object.keys(distribution);
    const xScale = d3.scaleBand()
      .domain(bins)
      .range([0, width])
      .padding(0.05);
    const xTicks = Math.min(bins.length, Math.floor(width / 20)); // Leave at least 20px for each tick
    container.select('.x.axis')
      .call(d3.axisBottom(xScale).ticks(xTicks))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('x', '-5')
      .attr('y', null)
      .attr('dy', '1em')
      .attr('text-anchor', 'end');
    container.select('.x.label')
      .attr('x', margin.left + width / 2)
      .attr('y', 12)
      .text(`Connections per ${classObj.className} ${classObj === this.edgeClass ? 'edge' : 'node'}`);
    const yDomain = [0, d3.max(Object.values(distribution).concat([1]))];
    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([height, 0]);
    container.select('.y.axis')
      .call(d3.axisLeft(yScale).tickValues(yDomain).tickFormat(d3.format('d')));
    container.select('.y.label')
      .attr('y', margin.left / 2)
      .attr('x', -(margin.top + height / 2))
      .text('Count');

    let bars = container.select('.chart').selectAll('.bar')
      .data(d3.entries(distribution), d => d.key);
    bars.exit().remove();
    const barsEnter = bars.enter().append('g').classed('bar', true);
    bars = bars.merge(barsEnter);

    barsEnter.append('rect');
    bars.select('rect')
      .attr('x', d => xScale(d.key))
      .attr('width', xScale.bandwidth())
      .attr('y', d => yScale(d.value))
      .attr('height', d => height - yScale(d.value))
      .attr('fill', '#' + classObj.annotations.color);
  }
  drawScatterplot (container, width, height, margin) {
    const xDomain = this._stats.length === 0 ? [0, 1]
      : d3.extent(this._stats.map(d => d.sourceOneToOneNess + d.targetOneToOneNess));
    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([0, width]);
    container.select('.x.axis')
      .call(d3.axisBottom(xScale).tickValues(xScale.domain()))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('x', '-5')
      .attr('y', null)
      .attr('dy', '1em')
      .attr('text-anchor', 'end');
    container.select('.x.label')
      .attr('x', margin.left + width / 2)
      .attr('y', height + margin.top + 20);
    const labelBounds = container.select('.x.label').node().getBoundingClientRect();
    const svgBounds = container.select('svg').node().getBoundingClientRect();
    container.select('.helpBubble')
      .attr('cx', labelBounds.right - 4 - svgBounds.left)
      .attr('cy', (labelBounds.top + labelBounds.bottom) / 2 - 2 - svgBounds.top);
    const yDomain = this._stats.length === 0 ? [0, 1]
      : [0, d3.max(this._stats.map(d => d.matches))];
    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([height, 0]);
    container.select('.y.axis')
      .call(d3.axisLeft(yScale).tickValues(yScale.domain()));
    container.select('.y.label')
      .attr('y', margin.left / 2)
      .attr('x', -(margin.top + height / 2));

    let points = container.select('.chart').selectAll('.point')
      .data(this._stats, d => d.sourceAttr + '=' + d.targetAttr);
    points.exit().remove();
    const pointsEnter = points.enter().append('g').classed('point', true);
    points = points.merge(pointsEnter);

    points.attr('transform', d => `translate(${xScale(d.sourceOneToOneNess + d.targetOneToOneNess)}, ${yScale(d.matches)})`)
      .classed('selected', d => d.sourceAttr === this.sourceAttribute && d.targetAttr === this.targetAttribute)
      .on('click', d => {
        this._sourceAttribute = d.sourceAttr;
        this._targetAttribute = d.targetAttr;
        this.render();
      });

    pointsEnter.append('circle');
    points.select('circle')
      .attr('r', '4');

    points.select('.selected').raise();
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
        element.select('.ht_clone_top').style('top', null).style('bottom', `${this.scrollBarSize - 3}px`);
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
