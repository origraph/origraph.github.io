/* globals d3, mure, GoldenLayout */
import { View } from '../lib/uki.esm.js';
import MainMenu from './Menu/MainMenu.js';
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

const SLICE_MODES = {
  intersections: 'intersections',
  union: 'union'
};

const defaultSettings = {
  sliceMode: SLICE_MODES.union,
  sliceSettings: {
    // if not in union mode, there should be a key for every intersection
    union: {
      scrollIndex: 0
      // no sortAttr means to sort on item labels
    }
  },
  goldenLayoutConfig: {
    content: [
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
    ]
  }
};

class MainView extends View {
  constructor (d3el) {
    super(d3el);

    this.context = this.initContext();

    mure.on('linkedViewChange', linkedViewSpec => {
      if (linkedViewSpec.userSelection ||
         (linkedViewSpec.settings &&
          linkedViewSpec.settings[this.context.hash] &&
          linkedViewSpec.settings[this.context.hash].origraph)) {
        this.refresh(linkedViewSpec);
      }
    });
    mure.on('docChange', changedDoc => {
      // TODO: stupidly just always update everything; in the future we might be
      // able to ignore if our selection doesn't refer to the changed document
      this.refresh();
    });

    this.refresh();
  }
  initContext () {
    let result = null;
    // Select the view context specified by the URL
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
    // Default: return the root selection
    result = result || mure.selectAll();
    return result;
  }
  setContext (selectorList) {
    this.context = mure.selectAll(selectorList);
    window.history.replaceState({}, '',
      window.location.pathname + '?viewSelectors=' +
      encodeURIComponent(selectorList));
    this._lastSettings = this.settings;
    delete this.settings;
    this.refresh();
  }
  async refresh (linkedViewSpec) {
    linkedViewSpec = linkedViewSpec || await mure.getLinkedViews();

    let changedUserSelection = false;
    if (!this.userSelection) {
      // We need to initialize the userSelection
      this.render(); // 'Syncing user selection...' spinner
      if (!linkedViewSpec.settings) {
        // Force a full read of userSelection if we only got a settings delta
        linkedViewSpec = await mure.getLinkedViews();
      }
      this.userSelection = linkedViewSpec.userSelection;
      changedUserSelection = true;
    } else if (linkedViewSpec.userSelection) {
      // We got a simple update for the userSelection
      this.userSelection = linkedViewSpec.userSelection;
      changedUserSelection = true;
    }

    let changedSettings = false;
    if (!this.settings) {
      // We need to initialize the settings
      this.render(); // 'Syncing view settings...' spinner
      if (!linkedViewSpec.settings) {
        // Force a full read of the settings if we only got a userSelection delta
        linkedViewSpec = await mure.getLinkedViews();
      }
      if (!linkedViewSpec.settings[this.context.hash] ||
          !linkedViewSpec.settings[this.context.hash].origraph) {
        // Origraph hasn't seen this context before; apply default settings
        // (this will trigger a linkedViewChange event and call render again)
        let temp = { settings: {} };
        if (this._lastSettings) {
          // We changed contexts but already had view settings; save those
          // settings for the new context
          temp.settings[this.context.hash] = { origraph: this._lastSettings };
        } else {
          // Apply the default settings
          temp.settings[this.context.hash] = { origraph: defaultSettings };
        }
        mure.setLinkedViews(temp);
        return;
      } else {
        // Initialize the settings and layout
        this.settings = linkedViewSpec.settings[this.context.hash].origraph;
        changedSettings = true;
        [this.goldenLayout, this.subViews] = this.initSubViews(this.d3el.select('#contents'));
      }
    } else if (linkedViewSpec.settings) {
      // We got a simple update for the settings
      this.settings = linkedViewSpec.settings[this.context.hash].origraph;
      changedSettings = true;
    }

    if (changedUserSelection || changedSettings) {
      // TODO: calculate stuff
    }
    this.render();
  }
  setup () {
    this.hideTooltip();
    this.showOverlay({
      message: 'Loading assets...',
      spinner: true
    });
    // Set up the subViews
    this.menuView = new MainMenu(this.d3el.select('#menu'));
  }
  initSubViews (contentsElement) {
    let subViews = [];

    let layout = new GoldenLayout(this.settings.goldenLayoutConfig, contentsElement.node());

    Object.entries(viewClasses).forEach(([className, ViewClass]) => {
      layout.registerComponent(className, ViewClass);
    });

    layout.on('stateChanged', () => {
      this.settings.goldenLayoutConfig = layout.toConfig();
      let temp = { settings: {} };
      temp.settings[this.context.hash] = { origraph: this.settings };
      mure.setLinkedViews(temp);
    });

    layout.init();
    return [layout, subViews];
  }
  resize () {
    if (this.menuView) {
      this.menuView.render();
    }
    if (this.goldenLayout) {
      this.goldenLayout.updateSize();
    }
  }
  draw () {
    if (!this.userSelection) {
      this.showOverlay({
        message: 'Syncing user selection...',
        spinner: true
      });
    } else if (!this.settings) {
      this.showOverlay({
        message: 'Syncing view settings...',
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
MainView.SLICE_MODES = SLICE_MODES;

export default MainView;
