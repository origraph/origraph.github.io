/* globals d3 */
import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

const ICONS = {
  RootItem: 'img/root.svg',
  DocumentItem: 'img/document.svg',
  NullItem: 'img/null.svg',
  BooleanItem: 'img/boolean.svg',
  NumberItem: 'img/number.svg',
  StringItem: 'img/string.svg',
  DateItem: 'img/date.svg',
  ReferenceItem: 'img/reference.svg',
  ContainerItem: 'img/container.svg',
  TaggableItem: 'img/taggable.svg',
  SetItem: 'img/venn.svg',
  EdgeItem: 'img/edge.svg',
  NodeItem: 'img/node.svg',
  SupernodeItem: 'img/missing.svg'
};

class RawDataView extends ScrollableGoldenLayoutView {
  constructor (container) {
    super(container, RawDataView.icon, RawDataView.label);
  }
  setup () {
    super.setup();
    this.d3el.append('img')
      .classed('emptyState', true)
      .attr('src', 'img/noDataEmptyState.svg');
  }
  draw () {
    this.d3el.select('.emptyState')
      .style('display', window.mainView.allDocItems.length > 0 ? 'none' : null);
    this.drawRows(this.contentDiv, window.mainView.allDocItems);
  }
  drawCollapsibleSection ({
    className,
    closedIconPath,
    openIconPath,
    tooltip,
    rows,
    rowsEnter,
    summaryEnter,
    visibleWhen,
    badgeCount,
    drawContents
  }) {
    const sectionIsExpanded = d => {
      const itemSettings = window.mainView.settings.hierarchyExpansion[d.uniqueSelector];
      return itemSettings && itemSettings[className];
    };
    const toggleSection = d => {
      let itemSettings = window.mainView.settings.hierarchyExpansion[d.uniqueSelector];
      if (itemSettings && itemSettings[className]) {
        // Close the section
        delete itemSettings[className];
        if (Object.keys(itemSettings).length === 0) {
          delete window.mainView.settings.hierarchyExpansion[d.uniqueSelector];
        }
      } else {
        // Expand the section
        itemSettings = itemSettings || {};
        itemSettings[className] = true;
        window.mainView.settings.hierarchyExpansion[d.uniqueSelector] = itemSettings;
      }
      this.render();
      console.log('todo: save the updated settings');
    };

    const buttonEnter = summaryEnter.append('div')
      .classed(className, true)
      .classed('small', true)
      .classed('button', true)
      .on('click', toggleSection);
    const button = rows.select(`:scope > .summary > .${className}`)
      .style('display', d => visibleWhen(d) ? null : 'none')
      .classed('selected', sectionIsExpanded);
    buttonEnter.on('mouseover', () => {
      window.mainView.showTooltip({
        content: tooltip,
        targetBounds: button.node().getBoundingClientRect(),
        anchor: { y: 1 }
      });
    }).on('mouseout', () => {
      window.mainView.hideTooltip();
    });
    buttonEnter.append('a').append('img');
    button.select(`img`)
      .attr('src', d => sectionIsExpanded(d) ? openIconPath : closedIconPath);
    buttonEnter.append('div').classed('badge', true);
    button.select(`.badge`)
      .text(badgeCount);

    rowsEnter.append('div')
      .classed(className, true);
    rows.select(`:scope > .${className}`)
      .style('display', d => sectionIsExpanded(d) ? null : 'none');
    rows.each(function (d) {
      if (sectionIsExpanded(d)) {
        drawContents(d3.select(this).select(`:scope > .${className}`), d);
      }
    });
  }
  drawRows (contentEl, itemList) {
    let rows = contentEl.selectAll(':scope > .row').data(itemList);
    rows.exit().remove();
    let rowsEnter = rows.enter().append('div')
      .classed('row', true);
    rows = rows.merge(rowsEnter);

    let summaryEnter = rowsEnter.append('div')
      .classed('summary', true);

    // Item label
    summaryEnter.append('div').classed('label', true);
    rows.select(':scope > .summary > .label')
      .text(d => d.label);

    // Item type icon
    summaryEnter.append('div').classed('type', true)
      .append('img');
    rows.select(':scope > .summary > .type > img')
      .attr('src', d => ICONS[d.constructor.name]);

    // Item tags button and section
    this.drawCollapsibleSection({
      className: 'tags',
      openIconPath: 'img/tag.svg',
      closedIconPath: 'img/tag.svg',
      tooltip: 'Tags',
      rows,
      rowsEnter,
      summaryEnter,
      visibleWhen: d => !!d.value.$tags,
      badgeCount: d => d.value.$tags ? Object.keys(d.value.$tags).length : 0,
      drawContents: (d3el, d) => {
        d3el.text('todo: tags');
      }
    });

    // Item references button and section
    this.drawCollapsibleSection({
      className: 'references',
      openIconPath: 'img/reference.svg',
      closedIconPath: 'img/reference.svg',
      tooltip: 'References',
      rows,
      rowsEnter,
      summaryEnter,
      visibleWhen: d => d.value.$members || d.value.$edges || d.value.$nodes,
      badgeCount: d => {
        return (d.value.$members ? Object.keys(d.value.$members).length : 0) +
               (d.value.$edges ? Object.keys(d.value.$edges).length : 0) +
               (d.value.$nodes ? Object.keys(d.value.$nodes).length : 0);
      },
      drawContents: (d3el, d) => {
        d3el.text('todo: references');
      }
    });

    // Item contents button and section
    this.drawCollapsibleSection({
      className: 'containerContents',
      closedIconPath: 'img/container.svg',
      openIconPath: 'img/openContainer.svg',
      tooltip: 'Contents',
      rows,
      rowsEnter,
      summaryEnter,
      visibleWhen: d => !!d.contentItems,
      badgeCount: d => d.contentItems ? d.contentItemCount() : 0,
      drawContents: (d3el, d) => {
        this.drawRows(d3el, d.contentItems());
      }
    });

    // Meta items button and section (for documents)
    this.drawCollapsibleSection({
      className: 'meta',
      closedIconPath: 'img/meta.svg',
      openIconPath: 'img/meta.svg',
      tooltip: 'Metadata',
      rows,
      rowsEnter,
      summaryEnter,
      visibleWhen: d => !!d.metaItems,
      badgeCount: d => d.metaItems ? d.metaItemCount() : 0,
      drawContents: (d3el, d) => {
        this.drawRows(d3el, d.metaItems());
      }
    });

    // Item value (for primitives)
    summaryEnter.append('div').classed('value', true);
    rows.select(`:scope > .summary > .value`)
      .style('display', d => d.stringValue ? null : 'none')
      .text(d => d.stringValue ? d.stringValue() : '');
  }
}
RawDataView.icon = 'img/rawData.svg';
RawDataView.label = 'Raw Data';
export default RawDataView;
