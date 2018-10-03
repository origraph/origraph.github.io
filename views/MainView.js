/* globals GoldenLayout, origraph, d3 */
import { View } from '../node_modules/uki/dist/uki.esm.js';
import MainMenu from './MainMenu/MainMenu.js';
import InstanceGraph from '../models/InstanceGraph.js';
import NetworkModelGraph from '../models/NetworkModelGraph.js';
import Modal from './Modals/Modal.js';

class MainView extends View {
  constructor (d3el) {
    super(d3el);

    // Lookup for all active views, because GoldenLayout doesn't allow us to
    // access the classes it generates directly
    this.subViews = {};

    this.tableCounts = {};
    this.tableAttributes = {};

    this.instances = null;
    this.instanceGraph = new InstanceGraph();
    this.networkModelGraph = new NetworkModelGraph();

    origraph.on('tableUpdate', () => {
      this.render();
    });
    origraph.on('classUpdate', async () => {
      this.updateLayout();
      await this.updateSamplesAndAttributes();
      await Promise.all([
        this.networkModelGraph.update(),
        this.instanceGraph.update()
      ]);
      this.render();
    });
    this.updateSamplesAndAttributes();

    // Initialize the layout and subviews
    this.initSubViews(this.d3el.select('#contents'));
    this.render();
  }
  setup () {
    this.hideTooltip();
    this.showOverlay({
      content: '<h2>Loading page...</h2>',
      spinner: true
    });
    this.mainMenu = new MainMenu(this.d3el.select('#menu'));
    this.firstDraw = true;
    (async () => {
      await this.networkModelGraph.update();
      this.render();
    })();
  }
  draw () {
    this.mainMenu.render();
    Object.values(this.subViews).forEach(subView => {
      subView.render();
    });
    if (this.firstDraw) {
      this.firstDraw = false;
      this.hideOverlay();
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
  async updateSamplesAndAttributes () {
    this.sampling = true;
    const tableCountPromises = {};
    for (const [ classId, classObj ] of Object.entries(origraph.classes)) {
      this.tableCounts[classId] = null;
      tableCountPromises[classId] = classObj.table.countRows()
        .then(count => {
          this.tableCounts[classId] = count;
          this.render();
        });
    }
    await Promise.all(Object.values(tableCountPromises));
    this.tableAttributes = {};
    for (const [classId, classObj] of Object.entries(origraph.classes)) {
      this.tableAttributes[classId] = Object.values(classObj.table.getAttributeDetails());
      this.tableAttributes[classId].unshift(classObj.table.getIndexDetails());
    }
    this.sampling = false;
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
    const classIds = Object.keys(origraph.classes);
    const existingIds = {};
    let nullComponent;
    let tableParent;
    // Remove old components
    for (const component of components.TableView || []) {
      tableParent = component.parent;
      const classId = component.instance.classId;
      if (classId === null) {
        nullComponent = component;
      } else if (!origraph.classes[component.instance.classId]) {
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
  async showOverlay (options) {
    const overlay = this.d3el.select('#overlay');
    if (!options) {
      overlay.style('display', 'none');
    } else if (options instanceof Modal) {
      overlay.style('display', null);
      if (options !== this._currentModal) {
        overlay.html('');
        this._currentModal = options;
      }
      this._currentModal.render(overlay);
      return this._currentModal.response;
    } else {
      overlay.style('display', null);
      delete this._currentModal;
      overlay.html('');
      const modal = new Modal(options);
      modal.render(overlay);
      return modal.response;
    }
  }
  hideOverlay () {
    this.showOverlay(null);
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
      } else {
        d3.event.stopPropagation();
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

        menuItemsEnter.append('img')
          .classed('icon', true);
        menuItems.select('.icon')
          .attr('src', d => d.value.icon || null)
          .style('display', d => d.value.icon ? null : 'none');

        menuItemsEnter.append('label');
        menuItems.select('label')
          .text(d => d.key);

        menuItems.on('click', async d => {
          const result = d.value.onClick();
          if (result instanceof Promise) {
            await result;
          }
          this.hideTooltip();
        });
      }
    });
  }
  showClassContextMenu ({ classId, targetBounds = null } = {}) {
    const menuEntries = {
      'Rename': {
        icon: 'img/pencil.svg',
        onClick: async () => {
          const newName = await window.mainView
            .prompt('Enter a new name for the class', origraph.classes[classId].className);
          if (newName) {
            origraph.classes[classId].setClassName(newName);
          }
        }
      },
      'Interpret as Node': {
        icon: 'img/node.svg',
        onClick: () => {
          origraph.classes[classId].interpretAsNodes();
        }
      },
      'Interpret as Edge': {
        icon: 'img/edge.svg',
        onClick: () => {
          origraph.classes[classId].interpretAsEdges();
        }
      },
      'Delete': {
        icon: 'img/delete.svg',
        onClick: () => {
          origraph.classes[classId].delete();
        }
      }
    };
    if (origraph.classes[classId].type === 'Edge') {
      menuEntries['Toggle Direction'] = {
        icon: 'img/toggleDirection.svg',
        onClick: () => {
          origraph.classes[classId].toggleDirection();
        }
      };
    }
    this.showContextMenu({
      targetBounds,
      menuEntries
    });
  }
  async alert (message) {
    return this.showOverlay({
      content: `<h2>${message}</h2>`,
      ok: true
    });
  }
  async prompt (message, defaultValue = '') {
    return this.showOverlay({
      content: `<h2>${message}</h2>`,
      ok: resolve => {
        const value = d3.select('#overlay .prompt').property('value');
        resolve(value);
      },
      cancel: resolve => { resolve(null); },
      prompt: defaultValue
    });
  }
}

export default MainView;
