/* globals GoldenLayout, mure, d3 */
import { View } from '../node_modules/uki/dist/uki.esm.js';
import MainMenu from './MainMenu/MainMenu.js';

class MainView extends View {
  constructor (d3el) {
    super(d3el);

    // Lookup for all active views, because GoldenLayout doesn't allow us to
    // access the classes it generates directly
    this.subViews = {};

    this.sampling = false;

    mure.on('tableUpdate', () => {
      this.render();
    });
    mure.on('classUpdate', () => {
      this.updateSamples();
      this.updateLayout();
      this.render();
    });

    // Initialize the layout and subviews
    this.initSubViews(this.d3el.select('#contents'));
    this.updateSamples();
    this.render();
  }
  setup () {
    this.hideTooltip();
    this.showOverlay({
      message: 'Loading assets...',
      spinner: true
    });
    this.mainMenu = new MainMenu(this.d3el.select('#menu'));
  }
  draw () {
    const self = this;
    this.mainMenu.render();
    this.d3el.select(':scope > .emptyState')
      .style('display', this.goldenLayout.root.contentItems.length === 0 ? null : 'none');
    this.d3el.select('#samplingSpinner')
      .style('display', this.sampling ? null : 'none')
      .on('mouseover', function () {
        self.sampleSpinnerBounds = this.getBoundingClientRect();
        self.updateSampleTooltip();
      }).on('mouseout', () => {
        this.sampleSpinnerBounds = null;
        this.updateSampleTooltip();
      });
    Object.values(this.subViews).forEach(subView => {
      subView.render();
    });
    this.hideOverlay();
  }
  updateSampleTooltip () {
    if (this.sampleSpinnerBounds) {
      const currentTables = mure.getClassData();
      let content = 'Loaded:' +
        Object.entries(currentTables).map(([classId, { complete, data }]) => {
          return `<br/>${mure.classes[classId].className}: ${Object.keys(data).length} samples`;
        });
      this.showTooltip({
        content,
        targetBounds: this.sampleSpinnerBounds
      });
    } else {
      this.hideTooltip();
    }
  }
  saveLayoutState () {
    // debounce this call if goldenlayout isn't ready;
    // see https://github.com/golden-layout/golden-layout/issues/253#issuecomment-361144944
    clearTimeout(this.saveLayoutStateTimeout);
    if (!(this.goldenLayout &&
          this.goldenLayout.isInitialised &&
          this.goldenLayout.openPopouts.every(p => p.isInitialised))) {
      this.saveLayoutStateTimeout = setTimeout(() => {
        this.saveLayoutState();
      }, 200);
    } else {
      const config = this.goldenLayout.toConfig();
      window.localStorage.setItem('layout', JSON.stringify(config));
    }
  }
  updateSamples () {
    window.clearTimeout(this.sampleTimer);
    this.sampling = true;
    const iterators = {};
    for (const [ classId, classObj ] of Object.entries(mure.classes)) {
      iterators[classId] = classObj.table.iterate({ limit: Infinity });
    }

    let n = 0;
    const addSamples = async () => {
      let allDone = true;
      for (const iterator of Object.values(iterators)) {
        const sample = await iterator.next();
        if (!sample.done) {
          allDone = false;
        }
      }
      if (!allDone) {
        this.sampleTimer = window.setTimeout(addSamples, 5);
        n++;
        if (n >= 25) {
          // trigger a tooltip update for every 25 data points
          n = 0;
          this.updateSampleTooltip();
        }
      } else {
        this.sampling = false;
        this.render();
      }
    };
    this.sampleTimer = window.setTimeout(addSamples, 5);
  }
  getAttributes (classId) {
    return mure.classes[classId].table.attributes;
  }
  updateLayout () {
    const getDefaultContainer = () => {
      if (this.goldenLayout.root.contentItems.length === 0) {
        this.goldenLayout.root.addChild({
          type: 'column',
          content: []
        });
      }
      return this.goldenLayout.root.contentItems[0];
    };

    const components = {};
    for (const component of this.goldenLayout.root.getItemsByType('component')) {
      components[component.componentName] = components[component.componentName] || [];
      components[component.componentName].push(component);
    }
    for (const openPopout of this.goldenLayout.openPopouts) {
      for (const component of openPopout.getGlInstance().root.getItemsByType('component')) {
        components[component.componentName] = components[component.componentName] || [];
        components[component.componentName].push(component);
      }
    }
    // Make sure there's exactly one NetworkModelView
    if (!components.NetworkModelView) {
      getDefaultContainer().addChild({
        type: 'component',
        componentName: 'NetworkModelView',
        componentState: {},
        isClosable: false
      });
    } else {
      while (components.NetworkModelView.length > 1) {
        components.NetworkModelView[0].remove();
      }
    }
    // Make sure there's exactly one InstanceView
    if (!components.InstanceView) {
      getDefaultContainer().addChild({
        type: 'component',
        componentName: 'InstanceView',
        componentState: {},
        isClosable: false
      });
    } else {
      while (components.InstanceView.length > 1) {
        components.InstanceView[0].remove();
      }
    }

    // Make sure there's a TableView for each of the classes, or an empty one
    // if there are no classes
    const classIds = Object.keys(mure.classes);
    const existingIds = {};
    let nullComponent;
    let tableParent;
    // Remove old components
    for (const component of components.TableView || []) {
      tableParent = component.parent;
      const classId = component.instance.classId;
      if (classId === null) {
        nullComponent = component;
      } else if (!mure.classes[component.instance.classId]) {
        component.remove();
      } else {
        existingIds[classId] = true;
      }
    }
    // Figure out where to put any new components
    if (!tableParent) {
      tableParent = this.goldenLayout.root.getItemsByType('stack')[0];
      if (!tableParent) {
        getDefaultContainer().addChild({ type: 'stack' });
        tableParent = this.goldenLayout.root.getItemsByType('stack')[0];
      }
    }
    // Add any needed components
    for (const classId of classIds) {
      if (!existingIds[classId]) {
        tableParent.addChild({
          type: 'component',
          componentName: 'TableView',
          componentState: { classId },
          isClosable: false
        });
      }
    }
    if (classIds.length === 0 && !nullComponent) {
      tableParent.addChild({
        type: 'component',
        componentName: 'TableView',
        componentState: { classId: null },
        isClosable: false
      });
    } else if (classIds.length > 0 && nullComponent) {
      // Wait until the end to remove the null table, so that other tables
      // can be added next to it first
      nullComponent.remove();
    }
  }
  initSubViews (contentsElement) {
    const self = this;
    let config = window.localStorage.getItem('layout');
    config = config ? JSON.parse(config) : window.DEFAULT_LAYOUT;
    this.goldenLayout = new GoldenLayout(config, contentsElement.node());
    Object.entries(window.SUBVIEW_CLASSES)
      .forEach(([className, ViewClass]) => {
        this.goldenLayout.registerComponent(className, function (container, state) {
          const view = new ViewClass({ container, state });
          self.subViews[view.id] = view;
          return view;
        });
      });
    this.goldenLayout.on('initialised', () => {
      this.saveLayoutState();
    });
    this.goldenLayout.on('stateChanged', event => {
      this.saveLayoutState();
    });
    this.goldenLayout.on('windowOpened', () => {
      this.render();
    });
    this.goldenLayout.on('itemDestroyed', event => {
      if (event.instance) {
        console.warn(`TODO: delete class`);
        delete this.subViews[event.instance.id];
      }
    });

    try {
      this.goldenLayout.init();
    } catch (error) {
      if (error.type === 'popoutBlocked') {
        this.alert(`\
The last time you used this app, a view was in a popup that your \
browser just blocked (we've reverted to the default layout instead).

You can prevent this in the future by adding this site to the allowed \
sites in your browser settings.`);
        window.localStorage.removeItem('layout');
        this.initSubViews(contentsElement);
        return;
      } else {
        throw error;
      }
    }
    this.updateLayout();
  }
  resize () {
    if (this.mainMenu) {
      this.mainMenu.render();
    }
    if (this.goldenLayout) {
      this.goldenLayout.updateSize();
    }
  }
  showOverlay ({
    content = '',
    spinner = false,
    ok = null,
    cancel = null,
    prompt = null
  } = {}) {
    const overlay = this.d3el.select('#overlay');
    const overlayContent = overlay.select('.center');
    if (content === null) {
      overlay.style('display', 'none');
      return;
    } else if (typeof content === 'function') {
      content(overlayContent);
    } else {
      overlayContent.html(content);
    }
    overlay.style('display', null);

    if (spinner) {
      overlayContent.append('img')
        .classed('spinner', true)
        .attr('src', 'img/spinner.gif');
    }
    if (prompt !== null) {
      overlayContent.append('input')
        .classed('prompt', true)
        .property('value', prompt);
    }
    if (ok || cancel) {
      const dialogButtons = overlayContent.append('div')
        .classed('dialogButtons', true);
      if (cancel) {
        const cancelButton = dialogButtons.append('div')
          .classed('cancel', true)
          .classed('button', true)
          .on('click', cancel);
        cancelButton.append('a');
        cancelButton.append('span').text('Cancel');
      }
      if (ok) {
        const okButton = dialogButtons.append('div')
          .classed('ok', true)
          .classed('button', true)
          .on('click', ok);
        okButton.append('a');
        okButton.append('span').text('OK');
      }
    }
  }
  hideOverlay () {
    this.showOverlay({ content: null });
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
  showTooltip ({
    content = '',
    targetBounds = null,
    anchor = null
  } = {}) {
    const showEvent = d3.event;
    d3.select('body').on('click.tooltip', () => {
      if (showEvent !== d3.event) {
        this.hideTooltip();
      }
    });

    let tooltip = this.d3el.select('#tooltip')
      .style('left', null)
      .style('top', null)
      .style('display', content ? null : 'none');

    if (content) {
      if (typeof content === 'function') {
        content(tooltip);
      } else {
        tooltip.html(content);
      }
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
  showContextMenu ({
    menuEntries = {},
    targetBounds = null,
    anchor = null
  } = {}) {
    this.showTooltip({
      targetBounds,
      anchor,
      content: (tooltip) => {
        tooltip.html('');
        const verticalMenu = tooltip.append('div')
          .classed('vertical-menu', true);
        let menuItems = verticalMenu.selectAll('a')
          .data(d3.entries(menuEntries));
        menuItems.exit().remove();
        const menuItemsEnter = menuItems.enter().append('a');
        menuItems = menuItems.merge(menuItemsEnter);

        menuItems.text(d => d.key);
        menuItems.on('click', async d => {
          const result = d.value();
          if (result instanceof Promise) {
            await result;
          }
          this.hideTooltip();
        });
      }
    });
  }
  showClassContextMenu ({ classId, targetBounds = null } = {}) {
    this.showContextMenu({
      targetBounds,
      menuEntries: {
        'Rename': async () => {
          const newName = await window.mainView
            .prompt('Enter a new name for the class', mure.classes[classId].className);
          if (newName) {
            mure.classes[classId].setClassName(newName);
          }
        },
        'Interpret as Node': () => {
          mure.classes[classId].interpretAsNodes();
        },
        'Interpret as Edge': () => {
          mure.classes[classId].interpretAsEdges();
        },
        'Delete': () => {
          mure.classes[classId].delete();
        }
      }
    });
  }
  async alert (message) {
    return new Promise((resolve, reject) => {
      this.showOverlay({
        content: `<h2>${message}</h2>`,
        ok: () => { this.hideOverlay(); resolve(); }
      });
    });
  }
  async prompt (message, defaultValue = '') {
    return new Promise((resolve, reject) => {
      this.showOverlay({
        content: `<h2>${message}</h2>`,
        ok: () => {
          const value = d3.select('#overlay .prompt').property('value');
          this.hideOverlay();
          resolve(value);
        },
        cancel: () => { this.hideOverlay(); resolve(null); },
        prompt: defaultValue
      });
    });
  }
}

export default MainView;
