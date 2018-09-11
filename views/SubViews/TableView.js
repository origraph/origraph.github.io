/* globals d3, mure, Handsontable */
import GoldenLayoutView from './GoldenLayoutView.js';

function itemProxy (index) {
  // Handsontable doesn't have a good way to pass the actual, wrapped data items
  // in naturally (circular references result in stack overflow errors).
  // Instead, we give it a "dataset" just containing the indexes, that we use to
  // look up the original data items in columns functions
  return { index };
}

class TableView extends GoldenLayoutView {
  constructor ({ container, state = {} }) {
    super({
      container,
      icon: TableView.icon,
      label: TableView.label
    });
    this.classId = state.classId || null;
  }
  get id () {
    return (this.classId && this.classId + 'TableView') || 'EmptyTableView';
  }
  get icon () {
    if (this.classId === null) {
      return 'img/null.svg';
    }
    return `img/${mure.classes[this.classId].lowerCamelCaseType}.svg`;
  }
  isEmpty () {
    return this.classId === null;
  }
  setup () {
    super.setup();
    this.tableDiv = this.content.append('div');
    this.renderer = new Handsontable(this.content.append('div').node(), {
      data: [],
      dataSchema: itemProxy,
      colHeaders: [],
      columns: [],
      manualColumnResize: true,
      columnSorting: true,
      sortIndicator: true,
      readOnly: true,
      preventOverflow: 'horizontal',
      disableVisualSelection: true
    });
    this.renderer.addHook('afterRender', () => {
      this.finishTableDraw();
    });
  }
  setupTab () {
    super.setupTab();
    const self = this;
    if (!this.isEmpty()) {
      const classObj = mure.classes[this.classId];
      const titleElement = this.tabElement.select('.lm_title')
        .attr('contenteditable', 'true')
        .style('cursor', 'text')
        .style('font-style', classObj !== null && classObj.hasCustomName ? null : 'italic')
        .on('click', function () {
          // Hack to get contenteditable to actually work
          this.focus();
        }).on('keyup', function () {
          if (d3.event.keyCode === 13) { // return key
            this.blur();
          } else if (d3.event.keyCode === 27) { // esc key
            this.blur();
          }
        }).on('blur', () => {
          const newName = titleElement.text();
          if (classObj !== null && newName) {
            classObj.setClassName(newName);
          } else {
            window.mainView.render();
          }
        });
      this.tabElement.append('div')
        .classed('lm_tab_icon', true)
        .classed('hoverable', true)
        .style('background-image', 'url(img/hamburger.svg)')
        .on('click', function () {
          window.mainView.showClassContextMenu({
            classId: self.classId,
            targetBounds: this.getBoundingClientRect()
          });
        });
    }
  }
  drawTab () {
    const classObj = this.classId === null ? null : mure.classes[this.classId];
    const classLabel = classObj === null ? 'No active classes' : classObj.className;
    this.tabElement.select('.viewIcon')
      .style('background-image', `url(${this.icon})`);
    this.tabElement.select(':scope > .lm_title')
      .text(classLabel);
  }
  getCellRenderFunction ({ idColumn = false, isSelected = () => false } = {}) {
    return function (instance, td, row, col, prop, value, cellProperties) {
      Handsontable.renderers.TextRenderer.apply(this, arguments);
      const dataItem = instance.getSourceDataAtRow(row);
      d3.select(td).classed('selected', isSelected(dataItem))
        .classed('idColumn', idColumn);
    };
  }
  draw () {
    if (this.tabElement) {
      this.drawTab();
    }

    if (this.classId === null) {
      // TODO: show some kind of empty state content
    } else {
      const classObj = mure.classes[this.classId];
      const data = Object.keys(classObj.table.currentData.data);
      const attributes = classObj.table.attributes;
      attributes.unshift('ID');
      const columns = attributes.map((attr, columnIndex) => {
        if (columnIndex === 0) {
          return {
            data: (index, newIndex) => {
              // TODO: handle newIndex if readOnly is false
              return index;
            },
            renderer: this.getCellRenderFunction({
              idColumn: true
            })
          };
        } else {
          return {
            data: (index, newValue) => {
              // TODO: handle newValue if readOnly is false
              const value = classObj.table.currentData.data[index].row[attr];
              if (value === undefined) {
                return '';
              } else if (typeof value === 'object') {
                return '{}';
              } else {
                return value;
              }
            },
            renderer: this.getCellRenderFunction()
          };
        }
      });
      const colHeaders = (columnIndex) => {
        return `<div data-column-index="${columnIndex}" class="sortIndicator icon"></div>
          <div class="text">${attributes[columnIndex]}</div>
          <div data-attribute="${attributes[columnIndex]}" class="menu icon"></div>`;
      };
      const spec = {
        data,
        colHeaders,
        columns
      };
      this.renderer.updateSettings(spec);
      this.renderer.render();
    }
  }
  finishTableDraw () {
    // Patch event listeners on after the fact
    const classObj = mure.classes[this.classId];
    this.content.selectAll('.ht_clone_top .colHeader .sortIndicator')
      .on('click', function () {
        const columnSorting = this.renderer.getPlugin('ColumnSorting');
        const columnIndex = parseInt(this.dataset.columnIndex);
        columnSorting.sort(columnIndex, columnSorting.getNextOrderState(columnIndex));
      });
    this.content.selectAll('.ht_clone_top .colHeader .menu')
      .on('click', function () {
        const attribute = this.dataset.attribute;
        window.mainView.showContextMenu({
          targetBounds: this.getBoundingClientRect(),
          menuEntries: {
            'Aggregate': {
              onClick: () => {
                classObj.aggregate(attribute);
              }
            },
            'Expand...': {
              onClick: async () => {
                const delimiter = await window.mainView.prompt('Value Delimiter:', ',');
                if (delimiter !== null) {
                  classObj.expand(attribute, delimiter);
                }
              }
            },
            'Facet': {
              onClick: async () => {
                window.mainView.showOverlay({
                  content: `<div class="newClassNames"></div>`,
                  spinner: true
                });
                const newClasses = [];
                for await (const newClass of classObj.openFacet(attribute)) {
                  newClasses.push(newClass);
                  window.mainView.showOverlay({
                    content: overlay => {
                      let names = overlay.select('.newClassNames').selectAll('h3')
                        .data(newClasses);
                      const namesEnter = names.enter().append('h3');
                      names = names.merge(namesEnter);
                      names.text(classObj => classObj.className);
                    }
                  });
                }
                window.mainView.hideOverlay();
              }
            },
            'Sort': {
              onClick: async () => {
                window.mainView.alert(`Sorry, not implemented yet...`);
              }
            },
            'Filter...': {
              onClick: async () => {
                window.mainView.alert(`Sorry, not implemented yet...`);
              }
            },
            'Hide + Suppress': {
              onClick: async () => {
                window.mainView.alert(`Sorry, not implemented yet...`);
              }
            }
          }
        });
      });
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
