/* globals origraph, d3, Handsontable */
import Modal from './Modal.js';
import PathSpecificationView from './PathSpecificationView.js';

const ONE_TO_ONE_BAR_HEIGHT = 20;
const SYMLOG_CONSTANT = 10;

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
    this._stats = {};
    this._sourceAttribute = undefined;
    this._targetAttribute = undefined;
    this.pathSpecView = new PathSpecificationView(this.nodeClass);
  }
  async initStats () {
    this.startedStats = true;
    this.statWorker = new window.Worker('views/Modals/ConnectModalStatWorker.js');
    this.statWorker.onmessage = message => {
      delete this._sortedStatIds;
      if (message.data === 'done') {
        this.finishedStats = true;
      } else {
        const stat = JSON.parse(message.data);
        if (this._stats[stat.id]) {
          throw new Error(`Duplicate stat id: ${stat.id}`);
        }
        this._stats[stat.id] = stat;
      }
      this.render();
    };
    const sourceCounts = await this.sourceClass.countAllUniqueValues();
    const targetCounts = await this.targetClass.countAllUniqueValues();
    this.statWorker.postMessage([JSON.stringify(sourceCounts), JSON.stringify(targetCounts)]);
    this.render();
  }
  sortStats () {
    // Sort the stats by the best overall oneToOneNess heuristic
    this._sortedStatIds = Object.keys(this._stats);
    // Sort the stat ids
    this._sortedStatIds.sort((a, b) => {
      a = this._stats[a];
      b = this._stats[b];
      let aScore = a.sourceOneToOneNess + a.targetOneToOneNess;
      let bScore = b.sourceOneToOneNess + b.targetOneToOneNess;
      return bScore - aScore;
    });
  }
  get bestStat () {
    if (!this._sortedStatIds) {
      this.sortStats();
    }
    return this._stats[this._sortedStatIds[0]];
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
          <div class="oneToOneChart"></div>
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
    this.statWorker.terminate();
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
    this.statWorker.terminate();
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
      <svg class="mainContainer">
        <g class="chart"></g>
        <g class="x axis"></g>
        <g class="y axis"></g>
        <text class="x label" text-anchor="middle" y="0.85em"></text>
        <text class="y label" text-anchor="middle" transform="rotate(-90)">Count</text>
      </svg>`;
    this.d3el.select('.sourceDistribution').html(barChartBoilerplate);
    this.d3el.select('.targetDistribution').html(barChartBoilerplate);
    this.d3el.select('.oneToOneChart').html(`
      <div class="scroller">
        <svg></svg>
      </div>
      <svg class="mainContainer">
        <g class="x axis"></g>
        <circle class="helpBubble" r="0.5em"></circle>
        <text class="x label" text-anchor="middle" y="0.85em">One-to-one Cardinality<tspan class="helpMark" dx="0.5em">?</tspan></text>
        <text class="y label" text-anchor="middle" transform="rotate(-90)">Attribute Pairs</text>
      </svg>`);
    this.d3el.select('.oneToOneChart .helpBubble')
      .on('mouseenter', function () {
        window.mainView.showTooltip({
          content: `<div style="max-width:20em">
<p>This is a heuristic to help you identify which pair(s) of attributes get
close to a one-to-one relationship.</p>
<p>The value is the sum of a weighted count of 1 for every item in both classes,
divided by the number of each item's connections.</p>
<p>For example, an item with one connection gets a weight of 1; two connections
get a weight of 1/2; three gets 1/3; and so on. If an item has no connections,
it gets a weight of -1</p>
<p>This score is shown on a symlog scale, where a the region from
+/-${SYMLOG_CONSTANT} is linear, and each class's contribution to the overall
score is shown separately.<p>
</div>`,
          targetBounds: this.getBoundingClientRect(),
          hideAfterMs: 60000
        });
      }).on('mouseleave', () => {
        window.mainView.hideTooltip();
      });
  }
  drawStatViews () {
    const statSummaries = this.d3el.select('.statSummaries');
    statSummaries.select('.spinner').style('display', this.finishedStats ? 'none' : null);
    const bounds = statSummaries.node().getBoundingClientRect();
    const margin = { top: 20, right: 20, bottom: 40, left: 70 };
    const width = bounds.width - (margin.left + margin.right);
    const height = (bounds.height / 3) - (margin.top + margin.bottom);
    const charts = statSummaries.selectAll('svg.mainContainer')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    charts.select('.chart')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    charts.select('.x.axis')
      .attr('transform', `translate(${margin.left},${height + margin.top})`);
    charts.select('.y.axis')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    charts.select('.x.label')
      .attr('x', margin.left + width / 2);
    charts.select('.y.label')
      .attr('y', margin.left / 2)
      .attr('x', -(margin.top + height / 2));
    let currentStat = this.bestStat;
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
    this.drawBarChart(statSummaries.select('.sourceDistribution'),
      this.sourceClass, currentStat.sourceSummary, width, height, margin);
    this.drawBarChart(statSummaries.select('.targetDistribution'),
      this.targetClass, currentStat.targetSummary, width, height, margin);
    this.drawOneToOneChart(statSummaries.select('.oneToOneChart'),
      width, height, margin);
  }
  drawBarChart (container, classObj, distribution, width, height, margin) {
    const bins = Object.keys(distribution);
    const xScale = d3.scaleBand()
      .domain(bins)
      .range([0, width])
      .padding(0.1);
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
      .html(`Connections per <tspan fill="#${classObj.annotations.color}">${classObj.className}</tspan> ${classObj === this.edgeClass ? 'edge' : 'node'}`);
    const yDomain = [0, d3.max(Object.values(distribution).concat([1]))];
    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([height, 0]);
    container.select('.y.axis')
      .call(d3.axisLeft(yScale).tickValues(yDomain).tickFormat(d3.format('d')));

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
  getSymlogTicks (domain) {
    const ticks = [0];
    const minorInterval = 10 ** Math.floor(Math.log10(Math.max(Math.abs(domain[0]), Math.abs(domain[1]))));
    if (domain[0] < -SYMLOG_CONSTANT) {
      ticks.unshift(-SYMLOG_CONSTANT);
      let i = -minorInterval;
      while (i < SYMLOG_CONSTANT && i > domain[0]) {
        ticks.unshift(i);
        i -= minorInterval;
      }
    }
    if (domain[0] < 0) {
      ticks.unshift(domain[0]);
    }
    if (domain[1] > SYMLOG_CONSTANT) {
      ticks.push(SYMLOG_CONSTANT);
      let i = minorInterval;
      while (i > SYMLOG_CONSTANT && i < domain[1]) {
        ticks.push(i);
        i += minorInterval;
      }
    }
    if (domain[1] > 0) {
      ticks.push(domain[1]);
    }
    return ticks;
  }
  drawOneToOneChart (container, width, height, margin) {
    // First ensure that we have our sorted list of statIds
    if (!this._sortedStatIds) {
      this.sortStats();
    }

    // Container setup magic to enable scrolling
    const scrollHeight = this._sortedStatIds.length * ONE_TO_ONE_BAR_HEIGHT;
    container.select('.scroller')
      .style('left', margin.left + 'px')
      .style('top', margin.top + 'px')
      .style('width', (width + margin.right) + 'px')
      .style('height', height + 'px');
    container.select('.scroller svg')
      .attr('width', width)
      .attr('height', scrollHeight + 'px');

    // Set up x scale + axis + labels + help bubble
    // xDomain: we want it to reach to the highest and lowest individual heuristic,
    // as well as the sum, that exists
    const xDomain = [
      0,
      this._stats.length === 0 ? 1 : 0 // if no stats, use a dummy scale of 0 - 1
    ];
    for (const stat of Object.values(this._stats)) {
      const sum = stat.sourceOneToOneNess + stat.targetOneToOneNess;
      xDomain[0] = Math.min(xDomain[0], stat.sourceOneToOneNess, stat.targetOneToOneNess, sum);
      xDomain[1] = Math.max(xDomain[1], stat.sourceOneToOneNess, stat.targetOneToOneNess, sum);
    }
    const xScale = d3.scaleSymlog()
      .domain(xDomain)
      .constant(SYMLOG_CONSTANT)
      .range([0, width]);
    const ticks = container.select('.x.axis')
      .call(d3.axisBottom(xScale).tickValues(this.getSymlogTicks(xDomain)))
      .selectAll('.tick');
    const majorTicks = ticks.filter(d => d === 0 ||
      Math.abs(d) === SYMLOG_CONSTANT || d === xDomain[0] || d === xDomain[1]);
    majorTicks.select('text')
      .attr('transform', 'rotate(-45)')
      .attr('x', '-5')
      .attr('y', null)
      .attr('dy', '1em')
      .attr('text-anchor', 'end');
    majorTicks.select('line')
      .attr('y1', -height);
    const minorTicks = ticks.filter(d => d !== 0 &&
      Math.abs(d) !== SYMLOG_CONSTANT && d !== xDomain[0] && d !== xDomain[1]);
    minorTicks.select('text').remove();
    const labelBounds = container.select('.x.label .helpMark')
      .node().getBoundingClientRect();
    const svgBounds = container.select('svg.mainContainer').node().getBoundingClientRect();
    container.select('.helpBubble')
      .attr('cx', labelBounds.right - 4 - svgBounds.left)
      .attr('cy', (labelBounds.top + labelBounds.bottom) / 2 - 2 - svgBounds.top);

    // Set up y scale
    const yScale = d3.scaleBand()
      .domain(this._sortedStatIds)
      .range([0, scrollHeight])
      .padding(0.1);

    // Draw the bar groups
    let barGroups = container.select('.scroller svg').selectAll('.bar')
      .data(this._sortedStatIds, d => d);
    barGroups.exit().remove();
    const barGroupsEnter = barGroups.enter().append('g').classed('bar', true);
    barGroups = barGroups.merge(barGroupsEnter);

    // Selected styling and click interaction
    barGroups.classed('selected', d => {
      return this._stats[d].sourceAttr === this.sourceAttribute &&
        this._stats[d].targetAttr === this.targetAttribute;
    }).on('click', d => {
      this._sourceAttribute = this._stats[d].sourceAttr;
      this._targetAttribute = this._stats[d].targetAttr;
      this.render();
    });

    // Tooltip
    const self = this;
    barGroups.on('mouseenter', function (d) {
      const stat = self._stats[d];
      const sourceTag = stat.sourceAttr === self.sourceAttribute ? 'strong' : 'span';
      const sourceLabel = stat.sourceAttr === null ? 'Index' : stat.sourceAttr;
      const targetTag = stat.targetAttr === self.targetAttribute ? 'strong' : 'span';
      const targetLabel = stat.targetAttr === null ? 'Index' : stat.targetAttr;
      window.mainView.showTooltip({
        targetBounds: this.getBoundingClientRect(),
        hideAfterMs: 0,
        content: `
<${sourceTag} style="color:#${self.sourceClass.annotations.color}">
  ${sourceLabel}: ${Math.floor(stat.sourceOneToOneNess)}
</${sourceTag}><br/>
<${targetTag} style="color:#${self.targetClass.annotations.color}">
  ${targetLabel}: ${Math.floor(stat.targetOneToOneNess)}
</${targetTag}>`
      });
    }).on('mouseleave', () => {
      window.mainView.hideTooltip();
    });

    // Transition the bar groups
    const transition = d3.transition().duration(300);
    barGroupsEnter.attr('opacity', 0)
      .attr('transform', d => `translate(0,${yScale(d)})`);
    barGroups.transition(transition)
      .attr('opacity', d => {
        const stat = this._stats[d];
        if (this._sourceAttribute !== undefined && stat.sourceAttr !== this._sourceAttribute) {
          return 0.5;
        }
        if (this._targetAttribute !== undefined && stat.targetAttr !== this._targetAttribute) {
          return 0.5;
        }
        return 1;
      })
      .attr('transform', d => `translate(0,${yScale(d)})`);

    // Draw the bars themselves
    barGroupsEnter.append('path').classed('source', true)
      .attr('fill', '#' + this.sourceClass.annotations.color);
    barGroupsEnter.append('path').classed('target', true)
      .attr('fill', '#' + this.targetClass.annotations.color);
    const zero = xScale(0);
    const bandwidth = yScale.bandwidth();
    barGroups.select('.source')
      .attr('d', d => {
        const x = xScale(this._stats[d].sourceOneToOneNess);
        return `M${zero},0L${x},0L${x},${bandwidth}L${zero},${bandwidth}Z`;
      });
    barGroups.select('.target')
      .attr('d', d => {
        const stat = this._stats[d];
        if (Math.sign(stat.sourceOneToOneNess) === Math.sign(stat.targetOneToOneNess)) {
          // Both source and target are on the same side; start from the end of
          // the source bar
          const x0 = xScale(stat.sourceOneToOneNess);
          const x1 = xScale(stat.sourceOneToOneNess + stat.targetOneToOneNess);
          return `M${x0},0L${x1},0L${x1},${bandwidth}L${x0},${bandwidth}Z`;
        } else {
          // source and target are on different sides; we can draw the bar normally
          const x = xScale(stat.targetOneToOneNess);
          return `M${zero},0L${x},0L${x},${bandwidth}L${zero},${bandwidth}Z`;
        }
      });
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

    if (!this._sortedStatIds) {
      this.sortStats();
    }
    const statList = Object.values(this._stats);
    const currentStatId = `${this.sourceAttribute || '_origraph_index'}=${this.targetAttribute || '_origraph_index'}`;
    if (!this._stats[currentStatId]) {
      // If the currently selected pair of attributes don't have stats yet,
      // create a fake one
      statList.unshift({
        sourceAttr: this.sourceAttribute,
        targetAttr: this.targetAttribute
      });
    }

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
        element.select('.ht_clone_top').style('top', null).style('bottom', `7px`);
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
