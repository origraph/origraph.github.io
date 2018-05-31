/* globals d3 */
import { View } from '../lib/uki.esm.js';

class GoldenLayoutView extends View {
  constructor (container, icon, label) {
    super(null);
    this.container = container;
    this.container.setTitle(label);
    this.container.on('tab', tab => {
      tab.element.prepend(`<div class="lm_tab_icon" style="background-image:url('${icon}')"></div>`);
    });
    this.container.on('open', () => {
      this.render(d3.select(this.container.getElement()[0]));
    });
    this.container.on('show', () => this.render());
    this.container.on('resize', () => this.render());
  }
  setup () {}
  draw () {
    this.drawCount = this.drawCount || 0;
    this.drawCount++;
    this.d3el.html(`TODO: view not implemented<br/>Draw called ${this.drawCount} times`);
  }
}

class ScrollableGoldenLayoutView extends GoldenLayoutView {
  setup () {
    this.contentDiv = this.d3el.append('div')
      .classed('scrollArea', true);
  }
}
export { GoldenLayoutView, ScrollableGoldenLayoutView };
