/* globals d3 */
import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

const ICONS = {
  RootItem: 'img/missing.svg',
  DocumentItem: 'img/missing.svg',
  NullItem: 'img/missing.svg',
  BooleanItem: 'img/missing.svg',
  NumberItem: 'img/missing.svg',
  StringItem: 'img/missing.svg',
  DateItem: 'img/missing.svg',
  ReferenceItem: 'img/missing.svg',
  ContainerItem: 'img/missing.svg',
  TaggableItem: 'img/missing.svg',
  SetItem: 'img/missing.svg',
  EdgeItem: 'img/missing.svg',
  NodeItem: 'img/missing.svg',
  SupernodeItem: 'img/missing.svg'
};

class RawDataView extends ScrollableGoldenLayoutView {
  constructor (container) {
    super(container, RawDataView.icon, RawDataView.label);
  }
  setup () {
    super.setup();
  }
  draw () {
    console.log(window.mainView.rawHierarchy, window.mainView.settings.hierarchyExpansion);
    this.drawRows(this.contentDiv, window.mainView.rawHierarchy);
  }
  drawRows (contentEl, hierarchy) {
    let rows = contentEl.selectAll(':scope > details').data(hierarchy);
    rows.exit().remove();
    let rowsEnter = rows.enter().append('details');
    rows = rows.merge(rowsEnter);

    let summaryEnter = rowsEnter.append('summary');
    summaryEnter.append('img')
      .classed('rawIcon', true);
    summaryEnter.append('label')
      .classed('rawLabel', true);
    rows.select('.rawIcon')
      .attr('src', d => ICONS[d.item.constructor.name]);
    rows.select('.rawLabel')
      .text(d => d.item.label);

    const self = this;
    rows.each(function (d) {
      if (d.children) {
        self.drawRows(d3.select(this), d.children);
      } else {
        d3.select(this).selectAll(':scope > details')
          .remove();
      }
    });
  }
}
RawDataView.icon = 'img/rawData.svg';
RawDataView.label = 'Raw Data';
export default RawDataView;
