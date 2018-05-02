/* globals d3, mure */
import { View } from '../lib/uki.esm.js';
import NetworkModelView from './views/NetworkModelView.js';
import InstanceView from './views/InstanceView.js';
import SetView from './views/SetView.js';
import TableView from './views/TableView.js';

let viewClasses = {
  NetworkModelView,
  InstanceView,
  SetView,
  TableView
};

class MainView extends View {
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
    window.onpopstate = event => {
      mure.setLinkedViews({ view: mure.selectAll(event.state) });
    };

    this.handleGivenUrl();
  }
  handleGivenUrl () {
    // Parse the url we were given...
    const locationParameters = this.parseLocation();
    let tempViewSpec = null;
    Object.entries(locationParameters).forEach(([key, value]) => {
      if (key === 'viewSelectors') {
        try {
          tempViewSpec = { view: mure.selectAll(value) };
        } catch (err) {
          if (!err.INVALID_SELECTOR) {
            throw err;
          }
        }
      } else if (key === 'subViews') {
        this.subViews = value;
      }
    });

    // Default view settings if the URL didn't provide any
    this.subViews = (this.subViews || [
      'NetworkModelView',
      'InstanceView',
      'SetView',
      'TableView'
    ]).map(viewClassName => {
      // Initialize the subview classes
      return new viewClasses[viewClassName](this);
    });

    // If the URL gave us new viewSelectors that need to be propagated (e.g. the
    // user pasted a link), do it (this will trigger the docChange event and and
    // reset on its own)... otherwise, we need to call reset ourselves (but
    // don't pushState)
    if (tempViewSpec) {
      mure.setLinkedViews(this.viewSpec);
      this.render(); // 'Connecting...' spinner
    } else {
      this.reset(false);
    }
  }
  parseLocation () {
    let result;
    window.location.search.substr(1).split('&').forEach(chunk => {
      let [key, value] = chunk.split('=');
      result[key] = decodeURIComponent(value);
    });
    return result;
  }
  async reset (pushState) {
    this.viewSpec = null;
    this.render(); // 'Connecting...' spinner
    return this.update(await mure.getLinkedViews(), pushState);
  }
  async update (linkedViewSpec, pushState = true) {
    let changedView = !this.viewSpec || linkedViewSpec.view;
    let changedUserSelection = !this.viewSpec || linkedViewSpec.userSelection;
    let changedSettings = !this.viewSpec || linkedViewSpec.settings;

    this.viewSpec = linkedViewSpec;
    if (changedSettings) {
      this.viewSpec.settings.origraph = this.viewSpec.settings.origraph || {
        // Default settings that are synced across windows:
        sliceMode: MainView.SLICE_MODES.unified,
        sliceSettings: {
          // if not in unified mode, there should be a key for every intersection
          unified: {
            scrollIndex: 0
            // no sortAttr means to sort on item labels
          }
        }
      };
    }

    if (changedView) {
      this.slices = null;
      this.render(); // 'Collecting items...' spinner
      const items = await this.viewSpec.view.items();
      if (Object.keys(items).length > 0) {
        this.render(); // 'Slicing...' spinner
        this.slices = await this.computeSlices();
      }
    }
    if (changedUserSelection) {
      // trigger the userSelection Selection to cache its items
      await this.viewSpec.userSelection.items();
      // TODO: do we need to do anything with the selected items?
    }

    if (pushState && changedView) {
      window.history.pushState(this.viewSpec.view.selectorList, '', this.getUrl());
    }
    this.render();
  }
  composeUrl () {
    let url = window.location.origin + window.location.pathname + '?' +
      'viewSelectors=' + encodeURIComponent(this.viewSpec.view.selectorList) + '&' +
      'subViews=' + encodeURIComponent(this.subViews.map(subView => subView.prototype.constructor.name));
    return url;
  }
  async computeSlices () {
    let sliceMode = this.viewSpec.settings.origraph.sliceMode;
    if (sliceMode === GraphView.MODES.flat) {
      return this.viewSpec.view.getFlatGraphSchema();
    } else if (sliceMode === GraphView.MODES.intersection) {
      return this.viewSpec.view.getIntersectedGraphSchema();
    } else { // if (sliceMode === GraphView.MODES.container) {
      return this.viewSpec.view.getContainerSchema();
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
    } else if (!this.viewSpec.view.isCached ||
               !this.viewSpec.userSelection.isCached) {
      this.showOverlay({
        message: 'Collecting items...',
        spinner: true
      });
    } else {
      (async () => {
        const viewItems = this.viewSpec.view.items();
        const selectedItems = this.viewSpec.userSelection.items();
        if (viewItems.length === 0) {

        }
      })();
    }if (.length === 0) {
      this.showOverlay({
        message: 'No data selected',
        spinner: false
      });
    } else if (!this.slices) {
      this.showOverlay({
        message: 'Slicing...',
        spinner: true
      });
    } else {

      this.hideOverlay();
    }
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
MainView.SLICE_MODES = {
  slice: 'slice',
  unified: 'unified'
};

export default MainView;
