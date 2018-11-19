import { View } from '../../../node_modules/uki/dist/uki.esm.js';

class BaseMenu extends View {
  constructor (parentMenu, d3el) {
    super(d3el);
    this.parentMenu = parentMenu;
    this.requireProperties(['icon', 'label']);
  }
  get id () {
    return this.label;
  }
  getRootMenu () {
    let temp = this;
    while (temp.parentMenu) {
      temp = temp.parentMenu;
    }
    return temp;
  }
  setup () {
    this.summary = this.d3el.append('div')
      .classed('menuSummary', true);
    const button = this.summary.append('div')
      .classed('button', true);
    button.append('a')
      .append('img')
      .attr('src', this.icon);
    // Label in expanded menu
    this.summary.append('label')
      .classed('menuLabel', true)
      .text(this.label);
    // Show the tooltip when the menu is collapsed
    this.summary.on('mouseover', () => {
      if (!this.getRootMenu().expanded) {
        window.mainView.showTooltip({
          content: this.label,
          targetBounds: this.summary.node().getBoundingClientRect(),
          anchor: { x: -1 }
        });
      } else {
        window.mainView.hideTooltip();
      }
    });
    this.summary.on('mouseout', () => {
      window.mainView.hideTooltip();
    });
  }
  draw () {
    this.summary.select('.menuLabel')
      .style('display', this.getRootMenu().expanded ? null : 'none')
      .text(this.label);
    this.summary.select('.button img')
      .attr('src', this.icon);
  }
}

export default BaseMenu;
