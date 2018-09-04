/* globals d3, mure, Handsontable */
import GoldenLayoutView from './GoldenLayoutView.js';

function itemProxy (uniqueSelector) {
  return { uniqueSelector };
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
      // Patch event listeners on after the fact
      const self = this;
      this.content.selectAll('.ht_clone_top .colHeader .sortIndicator')
        .on('click', function () {
          const columnSorting = self.renderer.getPlugin('ColumnSorting');
          const columnIndex = parseInt(this.dataset.columnIndex);
          columnSorting.sort(columnIndex, columnSorting.getNextOrderState(columnIndex));
        });
      this.content.selectAll('.ht_clone_top .colHeader .menu')
        .on('click', () => { console.log('menu'); });
    });
    const self = this;
    if (!this.isEmpty()) {
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
  drawTitle () {
    const classObj = this.classId === null ? null : mure.classes[this.classId];
    const classLabel = classObj === null ? 'No active classes' : classObj.className;
    const titleElement = this.tabElement.select(':scope > .lm_title')
      .text(classLabel);
    const renameTitle = () => {
      const newName = titleElement.text();
      if (classObj !== null && newName) {
        classObj.setClassName(newName);
      } else {
        window.mainView.render();
      }
    };
    titleElement.attr('contenteditable', 'true')
      .style('cursor', 'text')
      .style('font-style', classObj !== null && classObj.hasCustomName ? null : 'italic')
      .on('click', function () {
        // Hack to get contenteditable to actually work
        this.focus();
      }).on('blur', renameTitle)
      .on('keyup', function () {
        if (d3.event.keyCode === 13) { // return key
          this.blur();
        } else if (d3.event.keyCode === 27) { // esc key
          this.blur();
        }
      });
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
    this.drawTitle();

    if (this.classId === null) {
      // TODO: show some kind of empty state content
    } else {
      const classObj = mure.classes[this.classId];
      const data = Object.values(classObj.table.currentData.data);
      const attributes = classObj.table.attributes;
      attributes.unshift('ID');
      const columns = attributes.map((attr, columnIndex) => {
        if (columnIndex === 0) {
          return {
            data: (dataItem, newIndex) => {
              // TODO: handle newIndex if readOnly is false
              return dataItem.index;
            },
            renderer: this.getCellRenderFunction({
              idColumn: true
            })
          };
        } else {
          return {
            data: (dataItem, newValue) => {
              // TODO: handle newValue if readOnly is false
              const value = dataItem.row[attr];
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
          <div data-column-index="${columnIndex}" class="menu icon"></div>`;
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
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
