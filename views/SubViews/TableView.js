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
    const self = this;
    this.renderer.addHook('afterRender', () => {
      this.content.selectAll('.ht_clone_top .colHeader .text')
        .each(function () {
          self.drawColumnHeader(d3.select(this.parentNode), self.attributes[this.dataset.columnIndex]);
        });
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
  drawCell (element, attribute, dataValue) {
    element.classed('idColumn', attribute.name === null);
  }
  drawColumnHeader (element, attribute) {
    const self = this;
    const classObj = mure.classes[this.classId];

    // Remove handsontable's click handler (in the future, we want to use dragging
    // the column header for connection, not clicking for sorting)
    element.on('mousedown', () => {
      d3.event.stopPropagation();
    });

    const indicatorList = ['filtered', 'derived', 'copied', 'reduced']
      .filter(d => attribute[d]);
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

    indicators.style('background-image', d => `url(img/${d}.svg)`)
      .on('click', d => {
        if (d === 'ascending' || d === 'descending') {
          this.sortAttribute(attribute);
        } else {
          window.mainView.alert(`Sorry, clicking the ${d} indicator isn't implemented yet`);
        }
      });

    // Update the text label (maybe unnecessary?)
    element.select('.text').text(attribute.name === null ? 'ID' : attribute.name);

    // Attach menu event + entries
    element.select('.menu')
      .on('click', function () {
        window.mainView.showContextMenu({
          targetBounds: this.getBoundingClientRect(),
          menuEntries: {
            'Aggregate': {
              onClick: () => {
                classObj.aggregate(attribute.name);
              }
            },
            'Expand...': {
              onClick: async () => {
                const delimiter = await window.mainView.prompt('Value Delimiter:', ',');
                if (delimiter !== null) {
                  classObj.expand(attribute.name, delimiter);
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
                for await (const newClass of classObj.openFacet(attribute.name)) {
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
                self.sortAttribute(attribute);
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
  draw () {
    if (this.tabElement) {
      this.drawTab();
    }

    const self = this;

    if (this.classId === null) {
      // TODO: show some kind of empty state content
    } else {
      const classObj = mure.classes[this.classId];
      const data = Object.keys(classObj.table.currentData.data);
      this.attributes = Object.values(classObj.table.getAttributeDetails());
      this.attributes.unshift(classObj.table.getIndexDetails());
      this.attributes.forEach((attr, index) => {
        attr.columnIndex = index;
      });
      const columns = this.attributes.map(attribute => {
        return {
          renderer: function (instance, td, row, col, prop, value, cellProperties) {
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            const dataValue = instance.getSourceDataAtRow(row);
            self.drawCell(d3.select(td), attribute, dataValue);
          },
          data: (index, newValue) => {
            // TODO: handle newValue if readOnly is false
            if (attribute.name === null) {
              return index;
            } else {
              const value = classObj.table.currentData.data[index].row[attribute.name];
              if (value === undefined) {
                return '';
              } else if (typeof value === 'object') {
                return '{}';
              } else {
                return value;
              }
            }
          }
        };
      });
      const colHeaders = (columnIndex) => {
        const attribute = this.attributes[columnIndex];
        const name = attribute.name === null ? 'ID' : attribute.name;
        return `<div class="indicatorIcons"></div>
          <div class="text" data-column-index=${columnIndex}>${name}</div>
          <div class="menu icon"></div>`;
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
  sortAttribute (attribute) {
    const columnSorting = this.renderer.getPlugin('ColumnSorting');
    columnSorting.sort(attribute.columnIndex, columnSorting.getNextOrderState(attribute.columnIndex));
    const autoColumnSize = this.renderer.getPlugin('AutoColumnSize');
    autoColumnSize.recalculateAllColumnsWidth();
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
