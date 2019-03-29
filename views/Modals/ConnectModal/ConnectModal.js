/* globals origraph, d3, Handsontable */
import Modal from '../Modal.js';
import PathSpecificationView from '../PathSpecificationView.js';

class ConnectModal extends Modal {
  constructor (options) {
    super(Object.assign(options, {
      resources: [{ type: 'text', url: 'views/Modals/ConnectModal/template.html' }]
    }));
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
    this.statWorker = new window.Worker('views/Modals/ConnectModal/statWorker.js');
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
    super.setup();
    this.d3el.classed('ConnectModal', true).select('.modalContent').html(this.resources[0]);
    this.setupAttributeMenu('source');
    this.setupAttributeMenu('target');
    this.setupPairView();
    this.sourceRenderer = this.initTable(this.d3el.select('.sourceTable'), this.sourceClass, true);
    this.targetRenderer = this.initTable(this.d3el.select('.targetTable'), this.targetClass);
    this.pathSpecView.render(this.d3el.select('.PathSpecificationView'));
    this.pathSpecView.on('pathChange', () => { this.render(); });
    this.setupButtons();
  }
  draw () {
    if (this.closed) {
      return;
    }
    this.d3el.select('.edgeProjectionView')
      .style('display', this.edgeProjectionMode ? null : 'none');
    this.d3el.select('.attributeColumnsView')
      .style('display', this.edgeProjectionMode ? 'none' : null);

    this.drawButtons();
    if (this.edgeProjectionMode) {
      this.pathSpecView.render();
    } else {
      this.updateAttributeMenu(this.d3el.select('.source.attribute select'), this.sourceAttribute);
      this.updateAttributeMenu(this.d3el.select('.target.attribute select'), this.targetAttribute);
      const currentStatId = `${this.sourceAttribute || '_origraph_index'}=${this.targetAttribute || '_origraph_index'}`;
      const currentStat = this._stats[currentStatId] || {
        sourceSummary: { 0: 0 },
        targetSummary: { 0: 0 }
      };
      this.drawBarChart(this.d3el.select('.source.distribution'), this.sourceClass, currentStat.sourceSummary);
      this.drawBarChart(this.d3el.select('.target.distribution'), this.targetClass, currentStat.targetSummary);
      this.drawPairView();
      this.sourceRenderer.updateSettings({
        data: Object.keys(this.sourceClass.table.currentData.lookup)
      });
      if (!this._sourceHasBeenManuallyScrolled) {
        this.sourceRenderer.scrollToAttribute(this.sourceAttribute);
      }
      this.targetRenderer.updateSettings({
        data: Object.keys(this.targetClass.table.currentData.lookup)
      });
      if (!this._targetHasBeenManuallyScrolled) {
        this.targetRenderer.scrollToAttribute(this.targetAttribute);
      }
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
    this.closed = true;
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
          attribute: this.sourceAttribute,
          otherAttribute: this.targetAttribute
        }));
      }
    }
  }
  cancel (resolve) {
    this.statWorker.terminate();
    this.closed = true;
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
    this.d3el.select(`.${menuString}.attribute h3`)
      .style('color', `#${classObj.annotations.color}`)
      .text(classObj.className);
    const selectMenu = this.d3el.select(`.${menuString}.attribute select`);
    // Update the list of attributes
    const attrList = d3.entries(classObj.table.getAttributeDetails());
    let attrs = selectMenu.select('optgroup').selectAll('option')
      .data(attrList, ({ key }) => key);
    attrs.exit().remove();
    const attrsEnter = attrs.enter().append('option');
    attrs = attrsEnter.merge(attrs);
    attrs.text(({ key }) => key);

    const setValue = () => {
      const attr = selectMenu.node().value || null;
      this[`_${menuString}Attribute`] = selectMenu.node().value || null;
      this[`${menuString}Renderer`].scrollToAttribute(attr);
      this.render();
    };

    selectMenu.on('change', setValue);
    selectMenu.on('click', setValue);
  }
  updateAttributeMenu (selectMenu, attribute) {
    selectMenu.node().value = attribute === null ? '' : attribute;
  }
  drawBarChart (container, classObj, distribution) {
    // Set up the SVG tag
    const bounds = container.node().getBoundingClientRect();
    const margin = { top: 20, right: 20, bottom: 40, left: 70 };
    const width = bounds.width - (margin.left + margin.right);
    const height = bounds.height - (margin.top + margin.bottom);
    const svg = container.select('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    svg.select('.chart')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    svg.select('.x.axis')
      .attr('transform', `translate(${margin.left},${height + margin.top})`);
    svg.select('.y.axis')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    svg.select('.x.label')
      .attr('x', margin.left + width / 2);
    svg.select('.y.label')
      .attr('y', margin.left / 2)
      .attr('x', -(margin.top + height / 2));

    // Scales / axes
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

    // Bars
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
  setupPairView () {
    this.d3el.select('.pairView .helpBubble')
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
<p>The final score is normalized by the number of items in each class, meaning
that a summed score of 2.0 should have a perfect one-to-one relationship, and
-2.0 would indicate that the pair is as far from one-to-one as possible.</p>
</div>`,
          targetBounds: this.getBoundingClientRect(),
          hideAfterMs: 60000
        });
      }).on('mouseleave', () => {
        window.mainView.hideTooltip();
      });
  }
  drawPairView () {
    // First ensure that we have our sorted list of statIds
    if (!this._sortedStatIds) {
      this.sortStats();
    }

    // Show / hide the spinner
    const container = this.d3el.select('.pairView');
    container.select('.spinner')
      .style('display', this.finishedStats ? 'none' : null);

    // Position stuff in the the axis layer
    const bounds = container.node().getBoundingClientRect();
    const globalGap = 2 * this.emSize;
    const margin = { top: globalGap + 40, right: 10, bottom: 40, left: 150 };
    const width = bounds.width - (margin.left + margin.right + this.scrollBarSize);
    const height = bounds.height - (margin.top + margin.bottom);
    const axisLayer = container.select('.axisLayer')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    axisLayer.selectAll('.global')
      .attr('transform', `translate(${margin.left},${globalGap})`);
    axisLayer.select('.local')
      .attr('transform', `translate(${margin.left},${height + margin.top})`);
    axisLayer.select('.label')
      .attr('x', margin.left + width / 2);
    const markBounds = container.select('.label .helpMark')
      .node().getBoundingClientRect();
    const svgBounds = axisLayer.node().getBoundingClientRect();
    container.select('.helpBubble')
      .attr('cx', markBounds.right - 4 - svgBounds.left)
      .attr('cy', (markBounds.top + markBounds.bottom) / 2 - 2 - svgBounds.top);

    // Set up vertical scrolling and y scale
    const barHeight = 30;
    const scrollHeight = this._sortedStatIds.length * barHeight;
    container.select('.scroller')
      .style('top', margin.top + 'px')
      .style('width', (margin.left + width + margin.right + this.scrollBarSize) + 'px')
      .style('height', height + 'px');
    container.select('.scroller svg')
      .attr('width', (margin.left + width + margin.right) + 'px')
      .attr('height', scrollHeight + 'px');
    container.select('.scroller #barClip rect')
      .attr('x', margin.left + 'px')
      .attr('width', width + 'px')
      .attr('height', height + 'px');
    const yScale = d3.scaleBand()
      .domain(this._sortedStatIds)
      .range([0, scrollHeight])
      .padding(0.1);
    const bandwidth = yScale.bandwidth();

    // Set up the global scale + axis
    // We want the domain to reach to the highest and lowest individual
    // heuristic, as well as their sum, that exists (use 0 - 1 if no stats yet)
    const globalDomain = [ 0, this._stats.length === 0 ? 1 : 0 ];
    for (const stat of Object.values(this._stats)) {
      const sum = stat.sourceOneToOneNess + stat.targetOneToOneNess;
      globalDomain[0] = Math.min(globalDomain[0], stat.sourceOneToOneNess, stat.targetOneToOneNess, sum);
      globalDomain[1] = Math.max(globalDomain[1], stat.sourceOneToOneNess, stat.targetOneToOneNess, sum);
    }
    const globalScale = d3.scaleLinear()
      .domain(globalDomain)
      .range([0, width])
      .clamp(true);
    container.select('.global.axis')
      .call(d3.axisBottom(globalScale))
      .selectAll('.tick text')
      .attr('transform', 'rotate(-45)')
      .attr('x', '-5')
      .attr('y', null)
      .attr('dy', '1em')
      .attr('text-anchor', 'end');

    // Helper function for getting the local domain and computing stacked bar
    // magnitudes
    const getLocalDomain = () => {
      if (this._localDomain) {
        return this._localDomain;
      } else {
        // The default zoom is roughly set for the (mostly) positive side
        return [Math.max(globalDomain[0], -globalDomain[1] / 4), globalDomain[1]];
      }
    };
    const magnitudes = d => {
      const stat = this._stats[d];
      const m = {
        absS: Math.abs(stat.sourceOneToOneNess),
        absT: Math.abs(stat.targetOneToOneNess),
        sum: stat.sourceOneToOneNess + stat.targetOneToOneNess
      };
      m.absSum = Math.abs(m.sum);
      m.absExtent = Math.max(m.absS, m.absT, m.absSum);
      m.extent = Math.sign(m.sum) * m.absExtent;
      m.middle = Math.sign(stat.sourceOneToOneNess) !== Math.sign(stat.targetOneToOneNess)
        ? m.sum : m.absS < m.absT ? stat.targetOneToOneNess : stat.sourceOneToOneNess;
      return m;
    };

    // Draw / update the pair groups
    let pairs = container.select('.scroller svg').selectAll('.pair')
      .data(this._sortedStatIds, d => d);
    pairs.exit().remove();
    const pairsEnter = pairs.enter().append('g').classed('pair', true);
    pairs = pairs.merge(pairsEnter);

    pairs.attr('transform', d => `translate(0,${yScale(d)})`)
      .classed('selected', d => {
        return this._stats[d].sourceAttr === this.sourceAttribute &&
          this._stats[d].targetAttr === this.targetAttribute;
      }).classed('ineligible', d => {
        const stat = this._stats[d];
        return (this._sourceAttribute !== undefined && stat.sourceAttr !== this._sourceAttribute) ||
          (this._targetAttribute !== undefined && stat.targetAttr !== this._targetAttribute);
      }).on('click', d => {
        this._sourceAttribute = this._stats[d].sourceAttr;
        this._targetAttribute = this._stats[d].targetAttr;
        // Zoom out if we click something that isn't fully visible
        const localDomain = getLocalDomain();
        const { extent } = magnitudes(d);
        if (localDomain[0] > extent || localDomain[1] < extent) {
          this._localDomain = [
            Math.min(localDomain[0], extent),
            Math.max(localDomain[1], extent)
          ];
        }
        // Scroll the tables
        this.sourceRenderer.scrollToAttribute(this._sourceAttribute);
        this.targetRenderer.scrollToAttribute(this._targetAttribute);
        this.render();
      });

    // Tooltip
    const self = this;
    pairs.on('mouseenter', function (d) {
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
  ${sourceLabel}: ${stat.sourceOneToOneNess}
</${sourceTag}><br/>
<${targetTag} style="color:#${self.targetClass.annotations.color}">
  ${targetLabel}: ${stat.targetOneToOneNess}
</${targetTag}>`
      });
    }).on('mouseleave', () => {
      window.mainView.hideTooltip();
    });

    // Draw labels
    const pairLabel = pairsEnter.append('text')
      .attr('text-anchor', 'end')
      .attr('x', margin.left - 0.5 * this.emSize)
      .attr('y', 2 * bandwidth / 3);
    pairLabel.append('tspan')
      .attr('fill', '#' + this.sourceClass.annotations.color)
      .text(d => this._stats[d].sourceAttr || 'Index');
    pairLabel.append('tspan')
      .text(' = ');
    pairLabel.append('tspan')
      .attr('fill', '#' + this.targetClass.annotations.color)
      .text(d => this._stats[d].targetAttr || 'Index');

    // Draw the bars
    pairsEnter.append('path').classed('source', true)
      .attr('fill', '#' + this.sourceClass.annotations.color)
      .attr('clip-path', 'url(#barClip)');
    pairsEnter.append('path').classed('target', true)
      .attr('fill', '#' + this.targetClass.annotations.color)
      .attr('clip-path', 'url(#barClip)');
    pairs.select('.source')
      .attr('mask', d => {
        const { absS, absT, absExtent, absSum } = magnitudes(d);
        return absExtent > absSum && absS < absT ? 'url(#maskStripe)' : null;
      });
    pairs.select('.target')
      .attr('mask', d => {
        const { absS, absT, absExtent, absSum } = magnitudes(d);
        return absExtent > absSum && absT <= absS ? 'url(#maskStripe)' : null;
      });

    // Nested function for quickly re-drawing the chart as sliders are dragged,
    // that doesn't need a full render() call
    const updateChart = () => {
      // Update the local scale + axis
      const localDomain = getLocalDomain();
      const localScale = d3.scaleLinear()
        .domain(localDomain)
        .range([0, width]);
      const ticks = container.select('.local.axis')
        .call(d3.axisBottom(localScale))
        .selectAll('.tick');
      ticks.select('text')
        .attr('transform', 'rotate(-45)')
        .attr('x', '-5')
        .attr('y', null)
        .attr('dy', '1em')
        .attr('text-anchor', 'end');
      ticks.select('line')
        .attr('y1', -height);

      // Update the global scale sliders
      container.select('.global.sliders .low')
        .attr('transform', `translate(${globalScale(localDomain[0])},0)`);
      container.select('.global.sliders .high')
        .attr('transform', `translate(${globalScale(localDomain[1])},0)`);

      // Update the bars
      const zero = localScale(0);
      pairs.select('.source')
        .attr('d', d => {
          const { absS, absT, middle, extent } = magnitudes(d);
          // if the source is smaller than the target, start it at the end of
          // the bar; otherwise start at zero
          const x0 = margin.left + (absS < absT ? localScale(extent) : zero);
          // draw to the middle
          const x1 = margin.left + (localScale(middle));
          return `M${x0},0L${x1},0L${x1},${bandwidth}L${x0},${bandwidth}Z`;
        });
      pairs.select('.target')
        .attr('d', d => {
          const { absS, absT, middle, extent } = magnitudes(d);
          // if the target is smaller than the source, start it at the end of
          // the bar; otherwise start at zero
          const x0 = margin.left + (absT <= absS ? localScale(extent) : zero);
          // draw to the middle
          const x1 = margin.left + (localScale(middle));
          return `M${x0},0L${x1},0L${x1},${bandwidth}L${x0},${bandwidth}Z`;
        });
    };

    // Call updateChart now, and when the sliders are dragged
    updateChart();
    container.select('.global.sliders .low')
      .call(d3.drag().on('drag', () => {
        this._localDomain = getLocalDomain();
        this._localDomain[0] = Math.min(this._localDomain[1] - 1, globalScale.invert(d3.event.x));
        updateChart();
      }));
    container.select('.global.sliders .high')
      .call(d3.drag().on('drag', () => {
        this._localDomain = getLocalDomain();
        this._localDomain[1] = Math.max(this._localDomain[0] + 1, globalScale.invert(d3.event.x));
        updateChart();
      }));
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
        let bottomOffset = -3;
        const wtHolder = element.select('.ht_master > .wtHolder').node();
        if (wtHolder.clientWidth < wtHolder.scrollWidth) {
          bottomOffset += this.scrollBarSize;
        }
        element.select('.ht_clone_top').style('top', null).style('bottom', `${bottomOffset}px`);
      }
      element.selectAll('.ht_clone_top .colHeader .text')
        .each(function () {
          self.drawColumnHeader(d3.select(this.parentNode),
            attrs[this.dataset.columnIndex],
            classObj,
            headersOnBottom);
        });
      // Sneaky hack to identify when the user has manually scrolled the
      // div (handsontable fires afterScrollHorizontally for programmatic
      // scrolling)
      element.select('.ht_master .wtHolder').on('scroll.manual', () => {
        if (!this._autoScrolling) {
          if (headersOnBottom) {
            this._sourceHasBeenManuallyScrolled = true;
          } else {
            this._targetHasBeenManuallyScrolled = true;
          }
          element.on('scroll.manual', null);
        } else {
          this._autoScrolling = false;
        }
      });
    });
    renderer.addHook('afterColumnResize', () => {
      this.drawConnections();
    });
    renderer.addHook('afterScrollHorizontally', () => {
      this.drawConnections();
    });
    // Monkey patch scrolling to attribute... there's probably a better way to
    // this...
    renderer.scrollToAttribute = attrName => {
      const colNumber = attrs.findIndex(attr => attr.name === attrName);
      this._autoScrolling = true;
      renderer.scrollViewportTo(0, colNumber);
    };
    return renderer;
  }
}

export default ConnectModal;
