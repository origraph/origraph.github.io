/* globals d3, mure */
import GoldenLayoutView from './GoldenLayoutView.js';

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
  SetItem: 'img/set.svg',
  EdgeItem: 'img/edge.svg',
  NodeItem: 'img/node.svg',
  SupernodeItem: 'img/missing.svg'
};

class RawDataView extends GoldenLayoutView {
  constructor (container) {
    super({
      container,
      icon: RawDataView.icon,
      label: RawDataView.label
    });
  }
  async drawReadyState (content) {
    const selectedItems = await window.mainView.userSelection.items();
    await this.drawRows({
      contentEl: content,
      itemList: await window.mainView.allDocsPromise,
      selectedItems
    });
    // Once everything has been draw, stretch the selectionTargets out
    // to be the width of the window
    content.selectAll('.selectionTarget')
      .style('width', content.node().scrollWidth + 'px');
  }
  async drawCollapsibleSection ({
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
      return window.mainView.settings.hierarchyExpansion[d.uniqueSelector] === className;
    };
    const toggleSection = d => {
      let selectedSection = window.mainView.settings.hierarchyExpansion[d.uniqueSelector];
      if (selectedSection === className) {
        // Close the section
        delete window.mainView.settings.hierarchyExpansion[d.uniqueSelector];
      } else {
        // Expand / change the section
        window.mainView.settings.hierarchyExpansion[d.uniqueSelector] = className;
      }
      this.render();
      window.mainView.saveSettings();
    };

    const buttonEnter = summaryEnter.append('div')
      .classed(className, true)
      .classed('small', true)
      .classed('button', true)
      .on('click', toggleSection);
    const button = rows.select(`:scope > .summary > .${className}`)
      .style('display', d => visibleWhen(d) ? null : 'none')
      .classed('selected', sectionIsExpanded);
    buttonEnter.on('mouseover', function () {
      window.mainView.showTooltip({
        content: tooltip,
        targetBounds: this.getBoundingClientRect(),
        anchor: { y: 1 }
      });
    }).on('mouseout', () => {
      window.mainView.hideTooltip();
    });
    buttonEnter.append('a').append('img');
    button.select(`img`)
      .attr('src', d => sectionIsExpanded(d) ? openIconPath : closedIconPath);
    buttonEnter.append('div').classed('badge', true);

    rowsEnter.append('div')
      .classed(className, true);
    rows.select(`:scope > .${className}`)
      .style('display', d => sectionIsExpanded(d) ? null : 'none');

    // Calculate the global coordinate of the left side of the pane
    const contentNode = this.content.node();
    let contentOffset = contentNode.getBoundingClientRect().left;
    contentOffset -= contentNode.scrollLeft;
    let contentPromises = [];
    rows.each(function (d) {
      contentPromises.push(new Promise(async (resolve, reject) => {
        const d3el = d3.select(this);
        d3el.select(`:scope > .summary > .${className}.button > .badge`)
          .text(await badgeCount(d));
        if (sectionIsExpanded(d)) {
          // Calculate the child offset = the left edge of the button, relative
          // to this.content
          let offset = d3el.select(`:scope > .summary > .${className}`).node()
            .getBoundingClientRect().left;
          offset -= contentOffset;
          await drawContents(d3el.select(`:scope > .${className}`), d, offset);
        }
        resolve();
      }));
    });
  }
  drawField ({
    className,
    rows,
    summaryEnter,
    value,
    onChange
  }) {
    summaryEnter.append('input').classed(className, true)
      .on('keyup', function () {
        if (d3.event.which === 13) {
          this.blur();
        }
      })
      .on('change', function (d) {
        onChange.call(this, d, this.value);
      });
    return rows.select(`:scope > .summary > .${className}`)
      .property('value', value);
  }
  sortItems (itemList) {
    return itemList.sort((a, b) => {
      if (a.contentItems && !b.contentItems) {
        // a has contents and b doesn't; put a after b
        return 1;
      } else if (b.contentItems && !a.contentItems) {
        // b has contents and a doesn't; put b after a
        return -1;
      } else if (!isNaN(Number(a.label)) && !isNaN(Number(b.label))) {
        // both or neither have contents; sort labels numerically
        return Number(a.label) - Number(b.label);
      } else {
        // both or neither have contents; sort labels alphabetically
        return a.label > b.label ? 1 : -1;
      }
    });
  }
  async drawRows ({
    contentEl,
    itemList,
    selectedItems,
    offset = null
  }) {
    let rows = contentEl.selectAll(':scope > .row')
      .data(this.sortItems(itemList), d => d.uniqueSelector);
    rows.exit().remove();
    let rowsEnter = rows.enter().append('div')
      .classed('row', true);
    rows = rows.merge(rowsEnter);

    // Target for selection inicator / interactions
    rowsEnter.append('div')
      .classed('selectionTarget', true)
      .on('click', d => {
        window.mainView.selectItem(d, d3.event.shiftKey);
      });

    rows.classed('selected', d => {
      return !!selectedItems[d.uniqueSelector];
    });

    let summaryEnter = rowsEnter.append('div')
      .classed('summary', true);

    // Item label
    let labels = this.drawField({
      className: 'label',
      rows,
      summaryEnter,
      value: d => d.label,
      onChange: async (d, newValue) => {
        await mure.alert(`Sorry, editing labels hasn't been implemented yet.`);
        this.render(); // clear out the bad value
      }
    });

    // If this is the first row, set offset to be the width of the longest
    // filename label, plus a little padding on the left
    if (offset === null) {
      offset = labels.nodes()
        .reduce((agg, el) => {
          return Math.max(agg, el.getBoundingClientRect().width);
        }, 0);
      offset += this.emSize;
    }
    // Apply the offset
    rows.select(':scope > .summary')
      .style('left', offset + 'px');

    // Item type icon
    summaryEnter.append('div').classed('type', true)
      .append('img')
      .on('mouseover', function (d) {
        window.mainView.showTooltip({
          content: 'Type: ' + d.type,
          targetBounds: this.getBoundingClientRect(),
          anchor: { y: 1 }
        });
      }).on('mouseout', () => {
        window.mainView.hideTooltip();
      });
    rows.select(':scope > .summary > .type > img')
      .attr('src', d => ICONS[d.constructor.name]);

    // Item tags button and section
    await this.drawCollapsibleSection({
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
    await this.drawCollapsibleSection({
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
      drawContents: (d3el, d, offset) => {
        d3el.text('todo: references');
      }
    });

    // Item contents button and section
    await this.drawCollapsibleSection({
      className: 'containerContents',
      closedIconPath: 'img/container.svg',
      openIconPath: 'img/openContainer.svg',
      tooltip: 'Contents',
      rows,
      rowsEnter,
      summaryEnter,
      visibleWhen: d => !!d.contentItems,
      badgeCount: async d => d.contentItems ? d.contentItemCount() : 0,
      drawContents: async (d3el, d, offset) => {
        await this.drawRows({
          contentEl: d3el,
          itemList: await d.contentItems(),
          selectedItems,
          offset
        });
      }
    });

    // Meta items button and section (for documents)
    await this.drawCollapsibleSection({
      className: 'meta',
      closedIconPath: 'img/meta.svg',
      openIconPath: 'img/meta.svg',
      tooltip: 'Metadata',
      rows,
      rowsEnter,
      summaryEnter,
      visibleWhen: d => !!d.metaItems,
      badgeCount: async d => d.metatItems ? d.metaItemCount() : 0,
      drawContents: async (d3el, d, offset) => {
        await this.drawRows({
          contentEl: d3el,
          itemList: await d.metaItems(),
          selectedItems,
          offset
        });
      }
    });

    // Item value (for primitives)
    this.drawField({
      className: 'value',
      rows,
      summaryEnter,
      value: d => d.stringValue ? d.stringValue() : '',
      onChange: (d, newValue) => {
        d.value = newValue;
        mure.putDoc(d.doc);
      }
    }).style('display', d => d.stringValue ? null : 'none');
  }
}
RawDataView.icon = 'img/rawData.svg';
RawDataView.label = 'Raw Data';
export default RawDataView;
