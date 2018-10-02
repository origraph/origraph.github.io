/* globals d3, mure, Handsontable */
import GoldenLayoutView from './GoldenLayoutView.js';

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
  get title () {
    return this.classId === null ? 'No active classes' : mure.classes[this.classId].className;
  }
  isEmpty () {
    return this.classId === null;
  }
  setup () {
    super.setup();
    this.tableDiv = this.content.append('div');
    this.renderer = new Handsontable(this.tableDiv.node(), {
      data: [],
      dataSchema: index => { return { index }; }, // Fake "dataset"
      // (Handsontable can't handle our actual Wrapper objects, because they have cycles)
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
    this.setupIcons();
  }
  setupIcons () {
    const self = this;
    const hiddenClassMenuEntries = {};
    const numHiddenClasses = Object.keys(hiddenClassMenuEntries).length;
    const buttons = [
      {
        title: 'Class Options',
        icon: 'img/hamburger.svg',
        onClick: (button) => {
          if (self.classId !== null) {
            window.mainView.showClassContextMenu({
              classId: self.classId,
              targetBounds: button.getBoundingClientRect()
            });
          }
        },
        disabled: self.classId === null
      },
      {
        title: 'Show Hidden Attributes',
        icon: 'img/show.svg',
        onClick: (button) => {
          if (numHiddenClasses > 0) {
            window.mainView.showContextMenu({
              menuEntries: hiddenClassMenuEntries,
              targetBounds: button.getBoundingClientRect()
            });
          }
        },
        disabled: numHiddenClasses === 0
      },
      {
        title: 'Derive Additional Attributes...',
        icon: 'img/add.svg',
        onClick: (button) => {
          window.mainView.alert(`Sorry, not implemented yet...`);
        },
        disabled: self.classId === null
      }
    ];

    let tableButtons = this.d3el.append('div')
      .classed('tableButtons', true)
      .selectAll('.button').data(buttons);
    const tableButtonsEnter = tableButtons.enter().append('div')
      .classed('button', true)
      .classed('small', true)
      .classed('disabled', d => d.disabled);
    tableButtonsEnter.append('a').append('img')
      .attr('src', d => d.icon);
    tableButtonsEnter.on('click', function (d) { d.onClick(this); })
      .on('mouseenter', function (d) {
        window.mainView.showTooltip({
          content: d.title,
          targetBounds: this.getBoundingClientRect()
        });
      });
  }
  setupTab () {
    super.setupTab();
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
    }
  }
  drawCell (element, attribute, dataValue) {
    element.classed('idColumn', attribute.name === null)
      .classed('metaColumn', attribute.meta)
      .classed('seedColumn', attribute.seed);
    if (attribute.seed) {
      const isSeeded = window.mainView.instanceGraph.contains(dataValue);
      element.text('')
        .classed('addSeed', !isSeeded)
        .classed('removeSeed', isSeeded)
        .on('click', async () => {
          if (isSeeded) {
            await window.mainView.instanceGraph.unseed(dataValue);
          } else {
            await window.mainView.instanceGraph.seed(dataValue);
          }
          this.render();
        });
    } else if (attribute.meta) {
      (async () => {
        let count = 0;
        if (attribute.edgeId) {
          const edgeIds = {};
          edgeIds[attribute.edgeId] = true;
          for await (const edgeItem of dataValue.edges({ edgeIds })) { // eslint-disable-line no-unused-vars
            count++;
          }
        } else if (attribute.name === 'Sources') {
          for await (const nodeItem of dataValue.sourceNodes()) { // eslint-disable-line no-unused-vars
            count++;
          }
        } else if (attribute.name === 'Targets') {
          for await (const nodeItem of dataValue.targetNodes()) { // eslint-disable-line no-unused-vars
            count++;
          }
        }
        element.text(count);
      })();
    }
  }
  drawColumnHeader (element, attribute) {
    const self = this;

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

    // Attach menu event
    element.select('.menu')
      .on('mouseenter', function () {
        window.mainView.showTooltip({
          content: 'Attribute Options',
          targetBounds: this.getBoundingClientRect()
        });
      })
      .on('mouseleave', () => { window.mainView.hideTooltip(); })
      .on('click', function () {
        self.showAttributeMenu(this.getBoundingClientRect(), attribute);
      });
  }
  showAttributeMenu (targetBounds, attribute) {
    const classObj = mure.classes[this.classId];

    let menuEntries = {};

    if (attribute.seed) {
      // Only one menu entry for the seed column (to seed everything)
      menuEntries['Seed All Rows'] = {
        icon: 'img/addSeed.svg',
        onClick: async () => {
          window.mainView.instanceGraph.seed(Object.values(classObj.table.currentData.data));
        }
      };
    } else {
      // Add sort, filter, and hide to all other columns
      const sortState = this.renderer.getPlugin('ColumnSorting')
        .getNextOrderState(attribute.columnIndex);
      const sortIcon = sortState === 'asc' ? 'img/ascending.svg'
        : sortState === 'desc' ? 'img/descending.svg' : 'img/null.svg';
      const sortLabel = sortState === 'none' ? 'Clear Sorting' : 'Sort';
      menuEntries[sortLabel] = {
        icon: sortIcon,
        onClick: () => {
          this.sortAttribute(attribute);
        }
      };

      menuEntries['Filter...'] = {
        icon: 'img/filter.svg',
        onClick: async () => {
          window.mainView.alert(`Sorry, not implemented yet...`);
        }
      };

      menuEntries['Hide'] = {
        icon: 'img/hide.svg',
        onClick: async () => {
          window.mainView.alert(`Sorry, not implemented yet...`);
        }
      };
    }

    if (attribute.name === null) {
      // Add Transpose to the ID column
      menuEntries['Rows to Tables'] = {
        icon: 'img/transpose.svg',
        onClick: () => {
          this.collectNewClasses(classObj.openTranspose());
        }
      };
    } else if (attribute.meta) {
      // Add options specific to meta columns (currently none)
    } else {
      // Add options specific to regular attributes
      menuEntries.Aggregate = {
        onClick: () => {
          classObj.aggregate(attribute.name);
        }
      };
      menuEntries['Expand...'] = {
        onClick: async () => {
          const delimiter = await window.mainView.prompt('Value Delimiter:', ',');
          if (delimiter !== null) {
            classObj.expand(attribute.name, delimiter);
          }
        }
      };
      menuEntries.Facet = {
        onClick: () => {
          this.collectNewClasses(classObj.openFacet(attribute.name));
        }
      };
    }
    window.mainView.showContextMenu({ targetBounds, menuEntries });
  }
  async collectNewClasses (iterator) {
    window.mainView.showOverlay({
      content: `<div class="newClassNames"></div>`,
      spinner: true
    });
    const newClasses = [];
    for await (const newClass of iterator) {
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
  draw () {
    super.draw();
    const self = this;

    if (this.classId === null) {
      // TODO: show some kind of empty state content
    } else {
      const classObj = mure.classes[this.classId];
      const currentTable = classObj.table.currentData;
      const data = Object.keys(currentTable.data);
      this.attributes = Object.values(classObj.table.getAttributeDetails());
      if (classObj.type === 'Node') {
        // Degree columns:
        for (const edgeId of Object.keys(classObj.edgeClassIds)) {
          const edgeClass = mure.classes[edgeId];
          this.attributes.unshift({
            name: `${edgeClass.className} Degree`,
            edgeId,
            meta: true
          });
        }
      } else if (classObj.type === 'Edge') {
        // Sources and Targets columns:
        this.attributes.unshift({
          name: 'Sources',
          meta: true
        });
        this.attributes.push({
          name: 'Targets',
          meta: true
        });
      }
      // ID column:
      this.attributes.unshift(classObj.table.getIndexDetails());
      // Instance seed column:
      this.attributes.push({
        name: 'Seed',
        seed: true,
        meta: true
      });
      this.attributes.forEach((attr, index) => {
        attr.columnIndex = index;
      });
      const columns = this.attributes.map(attribute => {
        return {
          renderer: function (instance, td, row, col, prop, value, cellProperties) {
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            const index = instance.getSourceDataAtRow(row);
            self.drawCell(d3.select(td), attribute, currentTable.data[index]);
          },
          data: (index, newValue) => {
            // TODO: handle newValue if readOnly is false
            if (attribute.name === null) {
              return index;
            } else if (attribute.meta) {
              // Meta values are computed asynchronously
              return '...';
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
