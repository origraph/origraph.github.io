/* globals d3, mure */
import { View } from '../lib/uki.esm.js';
// import queueAsync from '../lib/queueAsync.js';

class GraphView extends View {
  constructor (d3el) {
    super(d3el);
    this.requireProperties(['drawContents']);
    mure.on('linkedViewChange', linkedViewSpec => {
      this.update(linkedViewSpec);
    });
    mure.on('docChange', changedDoc => {
      // TODO: stupidly just always update; we might be able to ignore
      // if our selection doesn't refer to the changed document
      this.reset();
    });
    this.reset();
  }
  async reset () {
    this.viewSpec = null;
    this.render(); // 'Connecting...' spinner
    return this.update(await mure.getLinkedViews());
  }
  async update (linkedViewSpec) {
    let changedView = !this.viewSpec || linkedViewSpec.view;
    let changedUserSelection = !this.viewSpec || linkedViewSpec.userSelection;
    let changedSettings = !this.viewSpec || linkedViewSpec.settings;

    this.viewSpec = linkedViewSpec;
    if (changedSettings) {
      this.viewSpec.settings.origraph = this.viewSpec.settings.origraph || {
        sliceMode: GraphView.MODES.flat,
        windowSlices: null
      };
    }
    if (changedView) {
      this.viewCache = this.slices = null;
      this.render(); // 'Updating view...' spinner
      this.viewCache = await this.cacheSelection(this.viewSpec.view);
      if (Object.keys(this.viewCache.items).length > 0) {
        this.render(); // 'Slicing...' spinner
        this.slices = await this.computeSlices();
      }
    }
    if (changedUserSelection) {
      this.userSelectionCache = null;
      this.render(); // 'Getting selection...' spinner
      this.userSelectionCache = await this.cacheSelection(this.viewSpec.userSelection);
    }
    this.render();
  }
  async cacheSelection (selection) {
    let docLists = await selection.docLists();
    let items = await selection.items();
    return { docLists, items };
  }
  async computeSlices () {
    let sliceMode = this.viewSpec.settings.origraph.sliceMode;
    if (sliceMode === GraphView.MODES.flat) {
      return this.viewSpec.view.getFlatGraphSchema(this.viewCache.items);
    } else if (sliceMode === GraphView.MODES.intersection) {
      return this.viewSpec.view.getIntersectedGraphSchema(this.viewCache.items);
    } else { // if (sliceMode === GraphView.MODES.container) {
      return this.viewSpec.view.getContainerSchema(this.viewCache.items);
    }
  }
  setup () {
    this.hideTooltip();
    this.showOverlay({
      message: 'Loading assets...',
      spinner: true
    });
  }
  draw () {
    let contents = this.d3el.select('#contents');
    this.contentBounds = contents.node().getBoundingClientRect();
    contents.select('svg')
      .attr('width', this.contentBounds.width)
      .attr('height', this.contentBounds.height);

    if (!this.viewSpec) {
      this.showOverlay({
        message: 'Connecting...',
        spinner: true
      });
    } else if (!this.viewCache) {
      this.showOverlay({
        message: 'Updating view...',
        spinner: true
      });
    } else if (Object.keys(this.viewCache.items).length === 0) {
      this.showOverlay({
        message: 'No data selected',
        spinner: false
      });
    } else if (!this.slices) {
      this.showOverlay({
        message: 'Slicing...',
        spinner: true
      });
    } else if (!this.userSelectionCache) {
      this.showOverlay({
        message: 'Getting selection...',
        spinner: true
      });
    } else {
      this.drawMenu();
      this.drawContents();
      this.hideOverlay();
    }
  }
  drawMenu () {
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
  showOverlay ({ message = '', spinner = false } = {}) {
    let overlay = this.d3el.select('#overlay')
      .style('display', message || spinner ? null : 'none');
    overlay.select('.message')
      .text(message);
    overlay.select('.spinner')
      .style('display', spinner ? null : 'none');
  }
  hideOverlay () {
    this.showOverlay();
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
GraphView.MODES = {
  flat: 'flat',
  intersection: 'intersection',
  container: 'container'
};

export default GraphView;
