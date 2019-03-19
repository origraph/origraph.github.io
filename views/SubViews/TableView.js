/* globals d3, origraph, Handsontable */
import GoldenLayoutView from './GoldenLayoutView.js';
import DeriveModal from '../Modals/DeriveModal.js';
import FilterModal from '../Modals/FilterModal.js';

const INDICATOR_ICONS = {
  'filtered': 'img/filter.svg',
  'derived': 'img/deriveAttribute.svg',
  'tagged': 'img/tag.svg',
  'ascending': 'img/ascending.svg',
  'descending': 'img/descending.svg'
};

class TableView extends GoldenLayoutView {
  constructor ({ container, state = {} }) {
    super({
      container,
      icon: TableView.icon,
      label: TableView.label
    });
    this.classId = state.classId || null;
    this.sortConfig = null;
    if (this.classObj) {
      this.classObj.table.on('cacheBuilt', () => {
        this.render();
      });
    }
  }
  get classObj () {
    return (this.classId && origraph.currentModel.classes[this.classId]) || null;
  }
  get id () {
    return (this.classId && this.classId + 'TableView') || 'EmptyTableView';
  }
  get icon () {
    return this.classObj ? `img/${this.classObj.lowerCamelCaseType}.svg`
      : 'img/null.svg';
  }
  get title () {
    return this.classObj ? this.classObj.className
      : `${origraph.currentModel.name} has no classes`;
  }
  isEmpty () {
    return this.classObj === null;
  }
  setup () {
    super.setup();
    this.emptyStateDiv.html(`<h3>${origraph.currentModel.name} has no classes</h3>`);
    this.tableDiv = this.content.append('div');
    this.renderer = new Handsontable(this.tableDiv.node(), {
      data: [],
      dataSchema: index => { return { index }; }, // Fake "dataset"
      // (Handsontable can't handle our actual Wrapper objects, because they have cycles)
      colHeaders: [],
      columns: [],
      manualColumnResize: true,
      columnSorting: {
        initialConfig: this.sortConfig || {}
      },
      sortIndicator: true,
      readOnly: true,
      preventOverflow: 'horizontal',
      disableVisualSelection: true
    });
    const self = this;
    this.renderer.addHook('afterRender', () => {
      this.content.selectAll('.ht_clone_top .colHeader .text')
        .each(function () {
          self.drawColumnHeader(d3.select(this.parentNode), self.attributes[this.dataset.columnIndex]);
        });
    });
  }
  raise () {
    let container = this.container;
    let stack = container.parent;
    while (stack.type !== 'stack' && stack.type !== null) {
      stack = stack.parent;
      container = container.parent;
    }
    if (stack.type === 'stack') {
      stack.setActiveContentItem(container);
    }
  }
  setupTab () {
    super.setupTab();
    if (!this.isEmpty()) {
      const imageFilter = this.classObj.annotations.color
        ? `url(#recolorImageTo${this.classObj.annotations.color})` : null;
      this.tabElement.select('.viewIcon')
        .style('filter', imageFilter);
      const titleElement = this.tabElement.select('.lm_title')
        .style('color', this.classObj.annotations.color ? '#' + this.classObj.annotations.color : null)
        .style('font-style', this.classObj !== null && this.classObj.hasCustomName ? null : 'italic')
        .on('keyup', function () {
          if (d3.event.keyCode === 13) { // return key
            this.blur();
          } else if (d3.event.keyCode === 27) { // esc key
            this.blur();
          }
        }).on('blur', () => {
          const newName = titleElement.text();
          if (this.classObj !== null && newName) {
            this.classObj.setClassName(newName);
          } else {
            window.mainView.render();
          }
        });
    }
  }
  fillCell (element, value) {
    let text = value;
    element.classed('nullCell', value === null)
      .classed('undefinedCell', value === undefined)
      .classed('arrayCell', value instanceof Array)
      .classed('objectCell', typeof value === 'object' && value !== null && !(value instanceof Array));
    if (value === null) {
      text = 'null';
    } else if (value === undefined) {
      text = '';
    } else if (typeof value === 'object') {
      if (value instanceof Array) {
        text = `[${value.length}]`;
      } else {
        text = `{${Object.keys(value).length}}`;
      }
    }
    element.select('.cellWrapper').text(text);
  }
  async drawCell (element, attribute, dataValue) {
    /* Do some funky stuff to wrap values of each cell in a DIV for CSS reasons */
    let cellWrapper = element.select('.cellWrapper');
    if (cellWrapper.node() === null) {
      let cellContents = `<div class="cellWrapper">${element.html()}</div>`;
      // TODO: customize special cells here?
      element.html(cellContents);
      cellWrapper = element.select('.cellWrapper');
    }

    // Generic stuff that applies to all cells
    element.classed('idColumn', attribute.name === null)
      .classed('metaColumn', attribute.meta)
      .classed('highlighted', window.mainView.instanceGraph
        .highlightedSample[dataValue.instanceId]);
    element.on('click', async () => {
      const sample = {};
      sample[dataValue.instanceId] = dataValue;
      window.mainView.instanceGraph.seed(sample);
    });

    if (attribute.name === null) {
      // TODO: anything special for ID column?
    } else if (attribute.meta) {
      // Meta column contents are computed asynchronously
      (async () => {
        let idList = [];
        if (attribute.edgeClass) {
          const edgeIds = {};
          edgeIds[attribute.edgeClass.classId] = true;
          for await (const edgeItem of dataValue.edges({ edgeIds })) { // eslint-disable-line no-unused-vars
            idList.push(edgeItem.index);
          }
        } else if (attribute.sourceClass) {
          for await (const nodeItem of dataValue.sourceNodes()) { // eslint-disable-line no-unused-vars
            idList.push(nodeItem.index);
          }
        } else if (attribute.name === 'Targets') {
          for await (const nodeItem of dataValue.targetNodes()) { // eslint-disable-line no-unused-vars
            idList.push(nodeItem.index);
          }
        }
        cellWrapper.text(idList.join(','));
      })();
    } else if (dataValue.row[attribute.name] instanceof Promise) {
      // We need to wait for delayed contents
      cellWrapper.text('');
      (async () => {
        this.fillCell(element, await dataValue.row[attribute.name]);
      })();
    } else {
      // We can just drop the value in directly
      this.fillCell(element, dataValue.row[attribute.name]);
    }
  }
  drawColumnHeader (element, attribute) {
    const self = this;

    // Remove handsontable's click handler (we sort via the menu)
    element.on('mousedown', () => {
      d3.event.stopPropagation();
    });

    // Little hack to customize the ID column header
    d3.select(element.node().parentNode.parentNode)
      .classed('idColumn', attribute.name === null);

    const indicatorList = ['filtered', 'derived']
      .filter(d => attribute[d]);
    if (this.classObj.annotations.labelAttr === attribute.name ||
       (this.classObj.annotations.labelAttr === undefined && attribute.name === null)) {
      indicatorList.push('tagged');
    }
    if (element.classed('ascending')) {
      indicatorList.push('ascending');
    } else if (element.classed('descending')) {
      indicatorList.push('descending');
    }

    let indicators = element.select('.indicatorIcons')
      .selectAll('.icon')
      .data(indicatorList, d => d);
    indicators.exit().remove();
    const indicatorsEnter = indicators.enter().append('div')
      .classed('icon', true);
    indicators = indicators.merge(indicatorsEnter);

    indicators.style('background-image', d => `url(${INDICATOR_ICONS[d]})`)
      .on('click', d => {
        if (d === 'ascending' || d === 'descending') {
          this.sortAttribute(attribute);
        } else {
          window.mainView.alert(`Sorry, clicking the ${d} indicator doesn't do anything yet`);
        }
      });

    // Attach menu event
    element.select('.menu')
      .style('display', attribute.meta ? 'none' : null)
      .on('mouseenter', function () {
        window.mainView.showTooltip({
          content: 'Attribute Options',
          targetBounds: this.getBoundingClientRect()
        });
      })
      .on('click', function () {
        self.showAttributeMenu(this.getBoundingClientRect(), attribute);
      });
  }
  showAttributeMenu (targetBounds, attribute) {
    if (attribute.seed) {
      throw new Error(`You shouldn't be able to open the seed attribute menu`);
    }

    let menuEntries = {};

    // Add sort, filter, and hide to everything
    let sortState = this.getNextSortConfig(attribute);
    sortState = sortState && sortState.sortOrder;
    const sortIcon = sortState === 'asc' ? 'img/ascending.svg'
      : sortState === 'desc' ? 'img/descending.svg' : 'img/null.svg';
    const sortLabel = sortState === null ? 'Clear Sorting' : 'Sort';
    menuEntries[sortLabel] = {
      icon: sortIcon,
      onClick: () => {
        this.sortAttribute(attribute);
      }
    };

    menuEntries['Use as Label'] = {
      icon: 'img/tag.svg',
      onClick: () => {
        if (attribute.name === null) {
          this.classObj.deleteAnnotation('labelAttr');
        } else {
          this.classObj.setAnnotation('labelAttr', attribute.name);
        }
      }
    };

    menuEntries['Filter...'] = {
      icon: 'img/filter.svg',
      onClick: async () => {
        window.mainView.showModal(new FilterModal(this.classObj, attribute.name));
      }
    };

    menuEntries['Hide'] = {
      icon: 'img/hide.svg',
      onClick: async () => {
        if (attribute.name) {
          this.classObj.table.suppressAttribute(attribute.name !== null);
        }
      },
      disabled: () => attribute.name === null
    };

    menuEntries['Show Hidden Attributes'] = {
      icon: 'img/show.svg',
      onClick: (button) => {
        if (this.classObj && this.classObj.table.suppressedAttributes.length > 0) {
          const suppressedMenu = {};
          for (const attr of this.classObj.table.suppressedAttributes) {
            suppressedMenu[attr] = {
              onClick: () => {
                this.classObj.table.unSuppressAttribute(attr);
              }
            };
          }
          const fakeBounds = {
            left: d3.event.x,
            top: d3.event.y,
            right: d3.event.x,
            bottom: d3.event.y,
            width: 0,
            height: 0
          };
          // Need a timeout, because clicking also fires a later event
          // that will force this second context menu to close
          window.setTimeout(() => {
            window.mainView.showContextMenu({
              menuEntries: suppressedMenu,
              targetBounds: fakeBounds
            });
          }, 50);
        }
      },
      disabled: () => !this.classObj || this.classObj.table.suppressedAttributes.length === 0
    };

    menuEntries['New Attribute...'] = {
      icon: 'img/deriveAttribute.svg',
      onClick: (button) => {
        window.mainView.showModal(new DeriveModal(this.classObj, attribute.name));
      }
    };

    if (attribute.name === null) {
      // Add options specific to ID column (currently none)
      menuEntries['Expand Rows as Classes'] = {
        icon: 'img/transpose.svg',
        onClick: () => {
          this.collectNewClasses(this.classObj.openTranspose());
        }
      };
    } else if (attribute.meta) {
      // Add options specific to meta columns (currently none)
    } else {
      // Add options specific to regular attributes
      menuEntries['Promote Distinct Values'] = {
        icon: 'img/promote.svg',
        onClick: () => {
          this.classObj.promote(attribute.name);
        }
      };
      menuEntries['Expand Cells as Rows'] = {
        icon: 'img/expand.svg',
        onClick: () => {
          this.classObj.expand(attribute.name);
        }
      };
      menuEntries['Unroll Contents as Rows'] = {
        icon: 'img/unroll.svg',
        onClick: () => {
          this.classObj.unroll(attribute.name);
        }
      };
      menuEntries['Facet by Value'] = {
        icon: 'img/facet.svg',
        onClick: () => {
          this.collectNewClasses(this.classObj.openFacet(attribute.name));
        }
      };
    }
    window.mainView.showContextMenu({ targetBounds, menuEntries });
  }
  async collectNewClasses (iterator) {
    window.mainView.showModal({
      content: `<div class="newClassNames"></div>`,
      spinner: true
    });
    const newClasses = [];
    for await (const newClass of iterator) {
      newClasses.push(newClass);
      window.mainView.showModal({
        content: modal => {
          let names = modal.select('.newClassNames').selectAll('h3')
            .data(newClasses);
          const namesEnter = names.enter().append('h3');
          names = names.merge(namesEnter);
          names.text(classObj => classObj.className);
        }
      });
    }
    window.mainView.hideModal();
  }
  draw () {
    super.draw();
    const self = this;

    if (this.classObj === null) {
      // TODO: show some kind of empty state content
    } else {
      const currentTable = this.classObj.table.currentData;
      this.currentKeys = Object.keys(currentTable.lookup);
      this.attributes = Object.values(this.classObj.table.getAttributeDetails())
        .filter(attr => !attr.suppressed);
      if (this.classObj.type === 'Node') {
        // Connected ID columns:
        for (const edgeClass of this.classObj.edgeClasses()) {
          this.attributes.push({
            name: `${edgeClass.className}`,
            edgeClass,
            meta: true
          });
        }
      } else if (this.classObj.type === 'Edge') {
        // Sources and Targets columns:
        if (this.classObj.sourceClass) {
          this.attributes.push({
            name: `${this.classObj.sourceClass.className}`,
            sourceClass: this.classObj.sourceClass,
            meta: true
          });
        }
        if (this.classObj.targetClass) {
          this.attributes.push({
            name: `${this.classObj.targetClass.className}`,
            targetClass: this.classObj.targetClass,
            meta: true
          });
        }
      }
      // ID column:
      this.attributes.unshift(this.classObj.table.getIndexDetails());
      this.attributes.forEach((attr, index) => {
        attr.columnIndex = index;
      });
      const columns = this.attributes.map(attribute => {
        return {
          renderer: function (instance, td, row, col, prop, value, cellProperties) {
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            if (self.classObj && !self.classObj.deleted) {
              const index = instance.getSourceDataAtRow(instance.toPhysicalRow(row));
              const dataValue = currentTable.data[currentTable.lookup[index]];
              if (dataValue !== undefined) {
                self.drawCell(d3.select(td), attribute, dataValue);
              }
            }
          },
          data: (index, newValue) => {
            // TODO: handle newValue if readOnly is false
            // Note: these values are not actually displayed; they are only used
            // for handsontable's sorting
            if (attribute.name === null) {
              return index;
            } else if (!this.classObj || attribute.meta) {
              // No way to access a value
              return '...';
            } else {
              const rowIndex = this.classObj.table.currentData.lookup[index];
              const item = this.classObj.table.currentData.data[rowIndex];
              if (!item) {
                return '';
              }
              let value = item.row[attribute.name];
              if (value instanceof Promise) {
                value = (item.delayedRow && item.delayedRow[attribute.name]) || '...';
              }
              return value;
            }
          }
        };
      });
      const colHeaders = (columnIndex) => {
        const attribute = this.attributes[columnIndex];
        const name = attribute.name === null ? '&nbsp;' : attribute.name;
        return `<div class="indicatorIcons"></div>
          <div class="text" data-column-index=${columnIndex}>${name}</div>
          <div class="menu icon"></div>`;
      };
      const spec = {
        data: this.currentKeys,
        colHeaders,
        columns,
        columnSorting: {
          initialConfig: this.sortConfig || {}
        }
      };
      this.renderer.updateSettings(spec);
      this.renderer.render();
    }
  }
  getNextSortConfig (attribute) {
    if (!attribute) {
      return null;
    } else if (!this.sortConfig || this.sortConfig.column !== attribute.columnIndex) {
      return {
        column: attribute.columnIndex,
        sortOrder: 'asc'
      };
    } else if (this.sortConfig.sortOrder === 'asc') {
      return {
        column: attribute.columnIndex,
        sortOrder: 'desc'
      };
    } else {
      return null;
    }
  }
  sortAttribute (attribute) {
    const columnSorting = this.renderer.getPlugin('ColumnSorting');
    this.sortConfig = this.getNextSortConfig(attribute);
    if (this.sortConfig === null) {
      columnSorting.clearSort();
    } else {
      columnSorting.sort(this.sortConfig);
    }
    const autoColumnSize = this.renderer.getPlugin('AutoColumnSize');
    autoColumnSize.recalculateAllColumnsWidth();
  }
  scrollToInstance (instance) {
    let rowNumber = this.currentKeys.indexOf(String(instance.index));
    if (this.sortConfig) {
      rowNumber = this.renderer.toVisualRow(rowNumber);
    }
    this.renderer.scrollViewportTo(rowNumber, 0);
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
