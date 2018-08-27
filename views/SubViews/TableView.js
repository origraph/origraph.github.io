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
      columns: []
    });
  }
  getTextCellSpec (valueAccessor, isSelected, special = false) {
    return {
      data: (uniqueSelector, value) => {
        if (value) {
          mure.alert('Editing cell values is not yet supported');
        } else {
          return valueAccessor(uniqueSelector);
        }
      },
      renderer: function (instance, td, row, col, prop, value, cellProperties) {
        Handsontable.renderers.TextRenderer.apply(this, arguments);
        const uniqueSelector = instance.getSourceDataAtRow(row);
        d3.select(td).classed('selected', isSelected(uniqueSelector))
          .classed('special', special);
      }
    };
  }
  drawTitle () {
    const classObj = this.classId === null ? null : mure.classes[this.classId];
    const classLabel = classObj === null ? 'No active classes' : classObj.className;
    const titleElement = this.tabElement.select(':scope > .lm_title');
    const renameTitle = () => {
      const newName = titleElement.text();
      if (classObj !== null && newName) {
        classObj.setClassName(newName);
      } else {
        window.mainView.render();
      }
    };
    titleElement.attr('contenteditable', 'true')
      .text(classLabel)
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
  draw () {
    this.drawTitle();

    if (this.classId === null) {
      // TODO: show some kind of empty state content
    } else {
      (async () => {
        const colHeaders = await window.mainView.getAttributes(this.classId);
        const columns = colHeaders.map(attr => this.getTextCellSpec(
          d => {
            if (d[attr] === undefined) {
              return '';
            } else if (typeof d[attr] === 'object') {
              return d[attr] instanceof Array ? '[]' : '{}';
            } else {
              return d[attr];
            }
          },
          d => false
        ));
        const spec = {
          data: window.mainView.samples[this.classId],
          colHeaders,
          columns
        };
        this.renderer.updateSettings(spec);
        this.renderer.render();
      })();
    }
  }
}
TableView.icon = 'img/table.svg';
TableView.label = 'Attribute Table';
export default TableView;
