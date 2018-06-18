/* globals d3, mure, GoldenLayout */
import { View } from '../node_modules/uki/dist/uki.esm.js';
import MainMenu from './Menu/MainMenu.js';
import NetworkModelView from './NetworkModelView.js';
import InstanceView from './InstanceView.js';
import SetView from './SetView.js';
import RawDataView from './RawDataView.js';
import TableView from './TableView.js';
import AttributeSummaryView from './AttributeSummaryView.js';
import HelpView from './HelpView.js';

const VIEW_CLASSES = {
  RawDataView,
  SetView,
  NetworkModelView,
  InstanceView,
  TableView,
  AttributeSummaryView,
  HelpView
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
  hierarchyExpansion: {},
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
              componentName: 'RawDataView',
              componentState: {}
            }, {
              type: 'component',
              componentName: 'SetView',
              componentState: {}
            }, {
              type: 'component',
              componentName: 'NetworkModelView',
              componentState: {}
            }]
          }, {
            type: 'row',
            content: [{
              type: 'component',
              componentName: 'InstanceView',
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

    // Expose global enums that other views need access to
    this.SLICE_MODES = SLICE_MODES;
    this.VIEW_CLASSES = VIEW_CLASSES;

    this.context = this.initContext();

    mure.on('linkedViewChange', linkedViewSpec => {
      if (linkedViewSpec.userSelection ||
         (linkedViewSpec.settings &&
          linkedViewSpec.settings[this.context.hash] &&
          linkedViewSpec.settings[this.context.hash].origraph)) {
        this.refresh({ linkedViewSpec });
      }
    });
    mure.on('docChange', changedDoc => {
      // TODO: stupidly just always update everything; in the future we might be
      // able to ignore if our selection doesn't refer to the changed document
      this.refresh({ contentUpdated: true });
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
  saveSettings () {
    const temp = { settings: {} };
    temp.settings[this.context.hash] = {
      origraph: this.settings || this._lastSettings || defaultSettings
    };
    mure.setLinkedViews(temp);
  }
  selectItem (item, toggleMode = false) {
    const options = {};
    if (toggleMode) {
      options.mode = mure.DERIVE_MODES.XOR;
    }
    this.userSelection = this.userSelection
      .deriveSelection([item.uniqueSelector], options);
    mure.setLinkedViews({ userSelection: this.userSelection });
  }
  async loadExampleFile (filename) {
    let fileContents;
    try {
      fileContents = await d3.text(`docs/exampleDatasets/${filename}`);
    } catch (err) {
      mure.warn(err);
    }
    mure.uploadString(filename, null, null, fileContents);
  }
  async refresh ({ linkedViewSpec, contentUpdated = false } = {}) {
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
    if (changedUserSelection) {
      this.availableOperations = await this.userSelection.getAvailableOperations();
    }

    if (!this.settings) {
      // We need to initialize the settings
      this.render(); // 'Syncing view settings...' spinner
      if (!linkedViewSpec.settings) {
        // Force a full read of the settings if we only got a userSelection delta
        linkedViewSpec = await mure.getLinkedViews();
      }
      if (!linkedViewSpec.settings[this.context.hash] ||
          !linkedViewSpec.settings[this.context.hash].origraph) {
        // Origraph hasn't seen this context before; use this._lastSettings if
        // we have them, or apply the default settings (this.settings will be
        // undefined). This will trigger a linkedViewChange event and call
        // render again.
        this.saveSettings();
        return;
      } else {
        // Initialize the settings and layout
        this.settings = linkedViewSpec.settings[this.context.hash].origraph;
        this.goldenLayout = this.initSubViews(this.d3el.select('#contents'));
      }
    } else if (linkedViewSpec.settings) {
      // We got a simple update for the settings
      this.settings = linkedViewSpec.settings[this.context.hash].origraph;
    }

    if (contentUpdated || !this.allDocItems) {
      delete this.allDocItems;
      this.render(); // 'Collecting metadata...'
      this.allDocItems = await mure.allDocItems();
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
    let layout = new GoldenLayout(this.settings.goldenLayoutConfig, contentsElement.node());

    Object.entries(VIEW_CLASSES).forEach(([className, ViewClass]) => {
      layout.registerComponent(className, ViewClass);
    });

    const saveLayoutState = () => {
      // debounce this call if goldenlayout isn't ready;
      // see https://github.com/golden-layout/golden-layout/issues/253#issuecomment-361144944
      clearTimeout(this.saveLayoutStateTimeout);
      if (!(layout.isInitialised && layout.openPopouts.every(p => p.isInitialised))) {
        this.saveLayoutStateTimeout = setTimeout(() => {
          saveLayoutState();
        }, 200);
      } else {
        this.settings.goldenLayoutConfig = layout.toConfig();
        // Save the settings (auto-triggers a render once they're saved, but for
        // snappier menu feedback, we manually trigger its render function right
        // away)
        if (this.menuView) {
          this.menuView.render();
        }
        let temp = { settings: {} };
        temp.settings[this.context.hash] = { origraph: this.settings };
        mure.setLinkedViews(temp);
      }
    };
    layout.on('stateChanged', saveLayoutState);

    try {
      layout.init();
    } catch (error) {
      if (error.type === 'popoutBlocked') {
        mure.warn(`\
The last time you used this app, a view was in a popup that your \
browser just blocked (you will need to re-open the view from the \
menu).

You can prevent this in the future by adding this site to the allowed \
sites in your browser settings.`);
        // TODO: this hack successfully allows the rest of the main page to
        // initialize, but there's a minor bug if the user opens the blocked
        // popup in that it can't be popped back into the layout
        layout._subWindowsCreated = true;
        layout.init();
      } else {
        throw error;
      }
    }
    return layout;
  }
  isShowingSubView (className) {
    if (!this.goldenLayout) {
      return false;
    } else {
      return this.goldenLayout.root.getComponentsByName(className).length > 0;
    }
  }
  toggleSubView (className, state) {
    const viewIsShowing = this.isShowingSubView(className);
    state = state === undefined ? !viewIsShowing : state;
    if (state) {
      // Show the subview
      let targetIndex = this.goldenLayout.root.contentItems.length - 1;
      let target = targetIndex === -1 ? this.goldenLayout.root
        : this.goldenLayout.root.contentItems[targetIndex];
      target.addChild({
        type: 'component',
        componentName: className,
        componentState: {}
      });
    } else {
      // Close the subview
      const componentList = this.goldenLayout.root.getComponentsByName(className);
      // Should be exactly length 1, but just in case...
      componentList.forEach(component => {
        component.container.close();
      });
    }
  }
  getAllSubViews () {
    return Object.keys(VIEW_CLASSES).reduce((agg, className) => {
      return agg.concat(this.goldenLayout.root.getComponentsByName(className));
    }, []);
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
    this.d3el.select(':scope > .emptyState')
      .style('display', 'none');
    if (!this.userSelection || !this.availableOperations) {
      this.showOverlay({
        message: 'Syncing user selection...',
        spinner: true
      });
    } else if (!this.settings) {
      this.showOverlay({
        message: 'Syncing view settings...',
        spinner: true
      });
    } else if (!this.allDocItems) {
      this.showOverlay({
        message: 'Collecting metadata...',
        spinner: true
      });
    } else {
      this.menuView.render();
      const subViewList = this.getAllSubViews();
      this.d3el.select(':scope > .emptyState')
        .style('display', subViewList.length === 0 ? null : 'none');
      subViewList.forEach(subView => {
        subView.render();
      });
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
  /**
   * @param  {String} [content='']
   * The message that will be displayed; the empty string hides the tooltip
   * @param  {[type]} [targetBounds=null]
   * Specifies a target element that the tooltip should be positioned relative to
   * @param  {[type]} [anchor=null]
   * Specifies -1 to 1 positioning of the tooltip relative to targetBounds; for
   * example, x = -1 would right-align the tooltip to the left edge of
   * targetBounds, x = 0 would center the tooltip horizontally, and x = 1 would
   * left-align the tooltip to the right edge of targetBounds
   */
  showTooltip ({ content = '', targetBounds = null, anchor = null } = {}) {
    let tooltip = this.d3el.select('#tooltip')
      .style('left', null)
      .style('top', null)
      .style('display', content ? null : 'none')
      .html(content);
    if (content) {
      let tooltipBounds = tooltip.node().getBoundingClientRect();

      let left;
      let top;

      if (targetBounds === null) {
        // todo: position the tooltip WITHIN the window, based on anchor,
        // instead of outside the targetBounds
        throw new Error('tooltips without targets are not yet supported');
      } else {
        anchor = anchor || {};
        if (anchor.x === undefined) {
          if (anchor.y !== undefined) {
            // with y defined, default is to center x
            anchor.x = 0;
          } else {
            if (targetBounds.left > window.innerWidth - targetBounds.right) {
              // there's more space on the left; try to put it there
              anchor.x = -1;
            } else {
              // more space on the right; try to put it there
              anchor.x = 1;
            }
          }
        }
        if (anchor.y === undefined) {
          if (anchor.x !== undefined) {
            // with x defined, default is to center y
            anchor.y = 0;
          } else {
            if (targetBounds.top > window.innerHeight - targetBounds.bottom) {
              // more space above; try to put it there
              anchor.y = -1;
            } else {
              // more space below; try to put it there
              anchor.y = 1;
            }
          }
        }
        left = (targetBounds.left + targetBounds.right) / 2 +
               anchor.x * targetBounds.width / 2 -
               tooltipBounds.width / 2 +
               anchor.x * tooltipBounds.width / 2;
        top = (targetBounds.top + targetBounds.bottom) / 2 +
              anchor.y * targetBounds.height / 2 -
              tooltipBounds.height / 2 +
              anchor.y * tooltipBounds.height / 2;
      }

      // Clamp the tooltip so that it stays on screen
      if (left + tooltipBounds.width > window.innerWidth) {
        left = window.innerWidth - tooltipBounds.width;
      }
      if (left < 0) {
        left = 0;
      }
      if (top + tooltipBounds.height > window.innerHeight) {
        top = window.innerHeight - tooltipBounds.height;
      }
      if (top < 0) {
        top = 0;
      }
      tooltip.style('left', left + 'px')
        .style('top', top + 'px');
    }
  }
  hideTooltip () {
    this.showTooltip();
  }
}

export default MainView;
