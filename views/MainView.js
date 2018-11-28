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

    this.classColors = {};
    window.CLASS_COLORS.forEach(color => { this.classColors[color] = null; });

    origraph.on('changeCurrentModel', () => {
      this.handleClassChange();
    });
    this.handleClassChange();

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
      this.hideModal();
    }
  }
  async handleClassChange () {
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
    this.handleClassUpdate();
  }
  async handleClassUpdate () {
    this.updateLayout();
    (async () => {
      await Promise.all([
        this.networkModelGraph.update(),
        this.instanceGraph.update()
      ]);
      this.render();
    })();
    this.sampling = true;
    const tableCountPromises = {};
    for (const [ classId, classObj ] of Object.entries(origraph.currentModel.classes)) {
      // Assign colors where necessary
      if (!classObj.annotations.color) {
        const availableColors = Object.entries(this.classColors)
          .filter(([color, assignedClassId]) => !assignedClassId);
        if (availableColors.length > 0) {
          const color = availableColors[0][0];
          classObj.annotations.color = color;
          this.classColors[color] = classId;
        }
      }

      // Count the rows in each table (todo: compute histograms)
      this.tableCounts[classId] = null;
      tableCountPromises[classId] = classObj.table.countRows()
        .then(count => {
          this.tableCounts[classId] = count;
          this.render();
        });
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
  highlightInstance (instance, sourceSubView) {
    this.highlightedInstance = instance;
    const tableView = this.subViews[instance.classObj.classId + 'TableView'];
    if (!this.viewsShareStack(tableView, sourceSubView)) {
      tableView.raise();
    }
    this.render();
    if (tableView !== sourceSubView) {
      tableView.scrollToInstance(instance);
    }
  }
  clearHighlightInstance () {
    delete this.highlightedInstance;
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
  showTableContextMenu ({ modelId, tableId, targetBounds = null } = {}) {
    const menuEntries = {
      'Delete Table': {
        icon: 'img/delete.svg',
        onClick: () => {
          origraph.models[modelId].tables[tableId].delete();
        }
      }
    };
    this.showContextMenu({
      targetBounds,
      menuEntries
    });
  }
  showClassContextMenu ({ classId, targetBounds = null } = {}) {
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
        onClick: () => {
          origraph.currentModel.classes[classId].interpretAsEdges();
        }
      },
      'Delete': {
        icon: 'img/delete.svg',
        onClick: () => {
          origraph.currentModel.classes[classId].delete();
        }
      }
    };
    if (origraph.currentModel.classes[classId].type === 'Edge') {
      menuEntries['Toggle Direction'] = {
        icon: 'img/toggleDirection.svg',
        onClick: () => {
          origraph.currentModel.classes[classId].toggleDirection();
        }
      };
    }
    this.showContextMenu({
      targetBounds,
      menuEntries
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
