/* globals GoldenLayout, origraph, d3 */
import { View } from '../node_modules/uki/dist/uki.esm.js';
import MainMenu from './MainMenu/MainMenu.js';
import InstanceGraph from '../models/InstanceGraph.js';
import NetworkModelGraph from '../models/NetworkModelGraph.js';
import Modal from './Modals/Modal.js';
import HtmlModal from './Modals/HtmlModal.js';
import DeriveModal from './Modals/DeriveModal.js';

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
    this.instanceGraph.on('update', () => { this.render(); });
    this.networkModelGraph = new NetworkModelGraph();
    this.networkModelGraph.on('update', () => { this.render(); });

    this.classColors = {};

    this.handleModelChange();

    this.render();
  }
  setup () {
    this.hideTooltip();
    this.mainMenu = new MainMenu(this.d3el.select('#menu'));
    this.firstDraw = true;
  }
  draw () {
    this.mainMenu.render();
    Object.values(this.subViews).forEach(subView => {
      subView.render();
    });
    if (this.firstDraw) {
      this.firstDraw = false;
      if (window.localStorage.getItem('skipIntro')) {
        this.hideModal();
      } else {
        this.showIntro();
      }
    }
  }
  async handleModelChange () {
    if (!origraph.currentModel) {
      const existingModels = Object.values(origraph.models);
      if (existingModels.length > 0) {
        origraph.currentModel = existingModels[existingModels.length - 1];
      } else {
        origraph.createModel();
      }
    }
    origraph.currentModel.on('update:mainView', async () => {
      this.handleClassUpdate();
    });
    return this.handleClassUpdate();
  }
  getClassColor (classObj) {
    if (!classObj.annotations.color) {
      const availableColors = window.CLASS_COLORS
        .filter(color => !this.classColors[color]);
      if (availableColors.length > 0) {
        const color = availableColors[0];
        classObj.annotations.color = color;
        this.classColors[color] = classObj.classId;
      }
    }
    return classObj.annotations.color || 'BDBDBD';
  }
  async handleClassUpdate () {
    this.updateLayout();
    this.instanceGraph.reset();
    (async () => {
      await Promise.all([
        this.networkModelGraph.update(),
        this.instanceGraph.update()
      ]);
      this.render();
    })();
    this.sampling = true;
    const tableCountPromises = {};
    this.classColors = {};
    for (const [ classId, classObj ] of Object.entries(origraph.currentModel.classes)) {
      // Count the rows in each table (todo: compute histograms),
      // and make each class re-claim its color (so that unused colors can be
      // recycled)
      this.tableCounts[classId] = null;
      tableCountPromises[classId] = classObj.table.countRows()
        .then(count => {
          this.tableCounts[classId] = count;
          this.render();
        });
      if (classObj.annotations.color) {
        this.classColors[classObj.annotations.color] = true;
      }
    }
    await Promise.all(Object.values(tableCountPromises));

    // Update ordered lists of each attribute (todo: compute histograms)
    this.tableAttributes = {};
    for (const [classId, classObj] of Object.entries(origraph.currentModel.classes)) {
      this.tableAttributes[classId] = Object.values(classObj.table.getAttributeDetails());
      this.tableAttributes[classId].unshift(classObj.table.getIndexDetails());
    }
    this.sampling = false;
  }
  initLayout () {
    const self = this;
    // TODO: try to save the layout in localStorage? There were lots of weird
    // bugs when we did...
    const contentsElement = this.d3el.select('#contents');
    let config = window.DEFAULT_LAYOUT;
    this.goldenLayout = new GoldenLayout(config, contentsElement.node());
    Object.entries(window.SUBVIEW_CLASSES)
      .forEach(([className, ViewClass]) => {
        this.goldenLayout.registerComponent(className, function (container, state) {
          const view = new ViewClass({ container, state });
          self.subViews[view.id] = view;
          return view;
        });
      });
    this.goldenLayout.on('windowOpened', () => {
      this.render();
    });

    this.goldenLayout.init();
  }
  updateLayout () {
    if (!this.goldenLayout) {
      this.initLayout();
    }
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
    const classIds = Object.keys(origraph.currentModel.classes);
    const existingIds = {};
    let nullComponent;
    let tableParent;
    // Figure out which old components to remove, but don't toss them yet
    const componentsToRemove = [];
    for (const component of components.TableView || []) {
      tableParent = component.parent;
      const classId = component.instance.classId;
      if (classId === null) {
        nullComponent = component;
      } else if (!origraph.currentModel.classes[component.instance.classId]) {
        componentsToRemove.push(component);
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
    // Finally, remove components
    for (const component of componentsToRemove) {
      component.remove();
    }
  }
  viewsShareStack (viewA, viewB) {
    const aStacks = [];
    let parent = viewA.container.parent;
    while (parent !== null) {
      if (parent.isStack) {
        aStacks.push(parent);
      }
      parent = parent.parent;
    }
    parent = viewB.container.parent;
    while (parent !== null) {
      if (parent.isStack && aStacks.indexOf(parent) !== -1) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }
  resize () {
    if (this.mainMenu) {
      this.mainMenu.render();
    }
    if (this.goldenLayout) {
      this.goldenLayout.updateSize();
    }
  }
  async highlightSample (sample = {}, sourceSubView = null) {
    await this.instanceGraph.highlight(sample);
    const instances = Object.values(sample);
    // If a single instance was highlighted, and its table is NOT in the same
    // GoldenLayout stack as the current interaction, bring its table to the
    // front and scroll to its position
    if (instances.length === 1 && !!sourceSubView) {
      const instance = instances[0];
      const tableView = this.subViews[instance.classObj.classId + 'TableView'];
      if (!this.viewsShareStack(tableView, sourceSubView)) {
        tableView.raise();
        tableView.scrollToInstance(instance);
      }
    }
    this.render();
  }
  async clearHighlightSample () {
    return this.highlightSample();
  }
  async showModal (options) {
    const overlay = this.d3el.select('#overlay');
    const modal = this.d3el.select('#modal');
    if (!options) {
      overlay.style('display', 'none');
      modal.style('display', 'none');
      return;
    }
    if (options !== this._currentModal) {
      modal.attr('class', null).html('');
      this._currentModal = options instanceof Modal ? options
        : new Modal(options);
    }
    overlay.style('display', null);
    modal.style('display', null)
      .classed('defaultStyling', !options.customStyling);
    this._currentModal.render(modal);
    return this._currentModal.response;
  }
  hideModal () {
    this.showModal(null);
  }
  showHtmlModal (url) {
    this.showModal(new HtmlModal({ url, ok: true }));
  }
  async showIntro () {
    await this.showModal(new HtmlModal({
      url: 'docs/index.html',
      ok: () => {
        const showIntro = d3.select('#modal .dialogButtons .checkbox input').node().checked;
        if (showIntro) {
          window.localStorage.removeItem('skipIntro');
        } else {
          window.localStorage.setItem('skipIntro', 'true');
        }
      },
      checkboxText: 'Show this screen every time you visit'
    }));
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
    anchor = null,
    hideAfterMs = 1000
  } = {}) {
    window.clearTimeout(this._tooltipTimeout);
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
      .style('width', null)
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

      window.clearTimeout(this._tooltipTimeout);
      if (hideAfterMs > 0) {
        this._tooltipTimeout = window.setTimeout(() => {
          this.hideTooltip();
        }, hideAfterMs);
      }
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
      hideAfterMs: 0,
      content: (tooltip) => {
        tooltip.html('');
        const verticalMenu = tooltip.append('div')
          .classed('vertical-menu', true);
        let menuItems = verticalMenu.selectAll('a')
          .data(d3.entries(menuEntries));
        menuItems.exit().remove();
        const menuItemsEnter = menuItems.enter().append('a');
        menuItems = menuItems.merge(menuItemsEnter);

        menuItems.classed('disabled', d => d.value.disabled && d.value.disabled());

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
        // A flexbox bug in most browsers necessitates manually setting the
        // width of the tooltip (verticalMenu.node().getBoundingClientRect()
        // also computes incorrect dimensions):
        // https://stackoverflow.com/questions/33891709/when-flexbox-items-wrap-in-column-mode-container-does-not-grow-its-width/33899301#33899301
        let left = Infinity;
        let right = 0;
        menuItems.each(function () {
          const bounds = this.getBoundingClientRect();
          left = Math.min(left, bounds.left);
          right = Math.max(right, bounds.right);
        });
        tooltip.style('width', (this.emSize + right - left) + 'px'); // hard-coded padding for now

        // Allow for post-processing (e.g. used to color InstanceView's class
        // context menu)
        menuItems.each(function (d) {
          if (d.value.postProcess) { d.value.postProcess(this); }
        });
      }
    });
  }
  showTableContextMenu ({ modelId, tableId, targetBounds = null } = {}) {
    const menuEntries = {
      'Add As Generic Class': {
        icon: 'img/add.svg',
        onClick: () => {
          origraph.models[modelId].createClass({
            type: 'GenericClass',
            tableId
          });
        }
      },
      'Delete Table': {
        icon: 'img/delete.svg',
        onClick: () => {
          try {
            origraph.models[modelId].tables[tableId].delete();
          } catch (err) {
            if (err.inUse) {
              this.alert(`Can't delete table; it's in use by least one class`);
            } else {
              throw err;
            }
          }
        }
      }
    };
    this.showContextMenu({
      targetBounds,
      menuEntries
    });
  }
  getClassMenuEntries (classId) {
    const menuEntries = {
      'Rename': {
        icon: 'img/pencil.svg',
        onClick: async () => {
          const newName = await window.mainView
            .prompt('Enter a new name for the class', origraph.currentModel.classes[classId].className);
          if (newName) {
            origraph.currentModel.classes[classId].setClassName(newName);
          }
        }
      },
      'Interpret as Node': {
        icon: 'img/node.svg',
        onClick: () => {
          origraph.currentModel.classes[classId].interpretAsNodes();
        }
      },
      'Interpret as Edge': {
        icon: 'img/edge.svg',
        onClick: async () => {
          const classObj = origraph.currentModel.classes[classId];
          let autoconnect = false;
          if (classObj.type === 'Node' && classObj.canAutoConnect) {
            autoconnect = await this.confirm(`Preserve connections to node classes?
              Existing edge classes will still be detached.`);
          }
          origraph.currentModel.classes[classId].interpretAsEdges({ autoconnect });
        }
      },
      'Delete': {
        icon: 'img/delete.svg',
        onClick: () => {
          origraph.currentModel.classes[classId].delete();
        }
      },
      'New Attribute...': {
        icon: 'img/deriveAttribute.svg',
        onClick: (button) => {
          window.mainView.showModal(new DeriveModal(origraph.currentModel.classes[classId], null));
        }
      }
    };
    const classType = origraph.currentModel.classes[classId].type;
    if (classType === 'Edge') {
      menuEntries['Toggle Direction'] = {
        icon: 'img/toggleDirection.svg',
        onClick: () => {
          origraph.currentModel.classes[classId].toggleDirection();
        }
      };
    }
    return menuEntries;
  }
  showClassContextMenu ({ classId, targetBounds = null } = {}) {
    this.showContextMenu({
      targetBounds,
      menuEntries: this.getClassMenuEntries(classId)
    });
  }
  async alert (message) {
    return this.showModal({
      content: `<h2>${message}</h2>`,
      ok: true
    });
  }
  async confirm (message) {
    return this.showModal({
      content: `<h2>${message}</h2>`,
      ok: true,
      cancel: true
    });
  }
  async prompt (message, defaultValue = '') {
    return this.showModal({
      content: `<h2>${message}</h2>`,
      ok: resolve => {
        const value = d3.select('#modal .prompt').property('value');
        resolve(value);
      },
      cancel: resolve => { resolve(null); },
      prompt: defaultValue
    });
  }
}

export default MainView;
