/* globals d3, mure */
import { View } from '../lib/uki.esm.js';

class GraphView extends View {
  constructor (d3el) {
    super(d3el);
    mure.on('linkedViewChange', linkedViewSpec => {
      this.update(linkedViewSpec);
    });
    mure.on('docChange', changedDoc => {
      // TODO: stupidly just always update; we might be able to ignore
      // if our selection doesn't refer to the changed document
      this.reset();
    });
    this.viewSpec = null;
    this.reset();
  }
  async reset () {
    this.viewSpec = null;
    this.render(); // 'Connecting...' spinner
    return this.update(await mure.getLinkedViews());
  }
  async update (linkedViewSpec) {
    this.viewSpec = linkedViewSpec;
    this.docs = this.items = null;
    this.render(); // 'Fetching documents...' spinner
    this.docs = await this.viewSpec.selection.docs();
    this.render(); // 'Collecting items...' spinner
    this.items = await this.viewSpec.selection.items(this.docs);
  }
  setup (d3el) {
    this.hideTooltip();
    this.showOverlay(d3el, {
      message: 'Loading assets...',
      spinner: true
    });
  }
  async draw (d3el) {
    let contents = d3el.select('#contents');
    this.contentBounds = contents.node().getBoundingClientRect();
    contents.select('svg')
      .attr('width', this.contentBounds.width)
      .attr('height', this.contentBounds.height);

    if (!this.viewSpec) {
      this.showOverlay(d3el, {
        message: 'Connecting...',
        spinner: true
      });
    } if (!this.docs) {
      this.showOverlay(d3el, {
        message: 'Fetching documents...',
        spinner: true
      });
    } if (!this.items) {
      this.showOverlay(d3el, {
        message: 'Collecting items...',
        spinner: true
      });
    } else if (this.items.length === 0) {
      this.showOverlay(d3el, {
        message: 'No data selected',
        spinner: false
      });
    } else {
      this.drawMenu(d3el);
      this.hideOverlay(d3el);
    }
  }
  drawMenu (d3el) {
    throw new Error('unimplemented');
  }
  createTransitionList () {
    let t = d3;
    let result = [];
    [1000, 1000].forEach(d => {
      t = t.transition().duration(d);
      result.push(t);
    });
    return result;
  }
  showOverlay (d3el, { message = '', spinner = false } = {}) {
    let overlay = d3el.select('#overlay')
      .style('display', message || spinner ? null : 'none');
    overlay.select('.message')
      .text(message);
    overlay.select('.spinner')
      .style('display', spinner ? null : 'none');
  }
  hideOverlay (d3el) {
    this.showOverlay(d3el);
  }
  showTooltip (targetBounds = {}, content = '') {
    let tooltip = this.d3el.select('#tooltip')
      .style('display', content ? null : 'none')
      .html(content);
    if (content) {
      let tooltipBounds = tooltip.node().getBoundingClientRect();
      let left = targetBounds.left ? targetBounds.left - tooltipBounds.width : 0;
      if (left < 0) {
        left = targetBounds.right;
      }
      let top = targetBounds.top ? targetBounds.top - tooltipBounds.height : 0;
      if (top < 0) {
        top = targetBounds.bottom;
      }
      tooltip.style('left', left + 'px')
        .style('top', top + 'px');
    }
  }
  hideTooltip () {
    this.showTooltip();
  }
}

export default GraphView;
