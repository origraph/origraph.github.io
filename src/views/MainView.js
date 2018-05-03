/* globals d3, mure, GoldenLayout */
import { View } from '../lib/uki.esm.js';
import MenuView from './MenuView.js';
import NetworkModelView from './NetworkModelView.js';
import InstanceView from './InstanceView.js';
import SetView from './SetView.js';
import TableView from './TableView.js';

const viewClasses = {
  NetworkModelView,
  InstanceView,
  SetView,
  TableView
};

const defaultConfig = { content: [
  {
    type: 'row',
    content: [{
      type: 'column',
      content: [{
        type: 'row',
        content: [{
          type: 'component',
          componentName: 'NetworkModelView',
          componentState: {}
        }, {
          type: 'component',
          componentName: 'InstanceView',
          componentState: {}
        }]
      }, {
        type: 'row',
        content: [{
          type: 'component',
          componentName: 'SetView',
          componentState: {}
        }, {
          type: 'component',
          componentName: 'TableView',
          componentState: {}
        }]
      }]
    }]
  }
]};

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

    // If the URL gave us new viewSelectors that need to be propagated (e.g. the
    // user pasted a link), do it (this will trigger the docChange event and and
    // reset on its own)... otherwise, we need to call reset ourselves (but
    // don't pushState)
    const urlView = this.getUrlViewSelection();
    if (urlView) {
      this.viewSpec = null;
      this.render(); // 'Connecting...' spinner
      mure.setLinkedViews({ view: urlView });
    } else {
      this.reset();
    }
  }
  getUrlViewSelection () {
    let result = null;
    window.location.search.substr(1).split('&').forEach(chunk => {
      let [key, value] = chunk.split('=');
      if (key === 'viewSelectors') {
        try {
          result = mure.selectAll(decodeURIComponent(value));
        } catch (err) {
          if (!err.INVALID_SELECTOR) {
            throw err;
          }
        }
      }
    });
    return result;
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
    if (changedView) {
      this.render(); // 'Collecting items...' spinner
      // Update the URL to reflect the current selection
      window.history.replaceState({}, '',
        window.location.pathname + '?viewSelectors=' +
        encodeURIComponent(this.viewSpec.view.selectorList));
      // trigger the view Selection to cache its items
      await this.viewSpec.view.items();
    }
    if (changedUserSelection) {
      // trigger the userSelection Selection to cache its items
      await this.viewSpec.userSelection.items();
      // TODO: do we need to do anything with the selected items?
    }
    if (changedSettings) {
      // TODO: derive stuff from mure for the subviews to render,
      // depending sliceMode
      this.viewSpec.settings.origraph = this.viewSpec.settings.origraph || {
        // Default settings that are synced across windows:
        sliceMode: MainView.SLICE_MODES.union,
        sliceSettings: {
          // if not in union mode, there should be a key for every intersection
          union: {
            scrollIndex: 0
            // no sortAttr means to sort on item labels
          }
        }
      };
    }

    this.render();
  }
  initSubViews (contentsElement) {
    let subViews = [];
    let config = window.localStorage.getItem('goldenLayoutState');
    config = config ? JSON.parse(config) : defaultConfig;

    let layout = new GoldenLayout(config, contentsElement.node());
    layout.on('stateChanged', () => {
      window.localStorage.setItem('goldenLayoutState',
        JSON.stringify(layout.toConfig()));
    });

    Object.entries(viewClasses).forEach(([className, ViewClass]) => {
      layout.registerComponent(className, ViewClass);
    });

    layout.init();
    return [layout, subViews];
  }
  setup () {
    this.hideTooltip();
    this.showOverlay({
      message: 'Loading assets...',
      spinner: true
    });
    // Set up the subViews
    this.menuView = new MenuView(this.d3el.select('#menu'));
    [this.goldenLayout, this.subViews] = this.initSubViews(this.d3el.select('#contents'));
  }
  draw () {
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
      this.menuView.render();
      this.subViews.forEach(subView => { subView.render(); });
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
  intersections: 'intersections',
  union: 'union'
};

export default MainView;
