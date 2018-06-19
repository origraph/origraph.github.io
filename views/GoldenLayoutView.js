/* globals d3 */
import { View } from '../node_modules/uki/dist/uki.esm.js';

class GoldenLayoutView extends View {
  constructor ({
    container,
    icon,
    label,
    resources = {}
  }) {
    super(null, resources);
    this.container = container;
    this.container.setTitle(label);
    this.container.on('tab', tab => {
      tab.element.addClass(this.constructor.name);
      tab.element.prepend(`<div class="lm_tab_icon" style="background-image:url('${icon}')"></div>`);
    });
    this.container.on('open', () => {
      this.render(d3.select(this.container.getElement()[0]));
    });
    this.container.on('show', () => this.render());
    this.container.on('resize', () => this.render());
  }
  setup () {
    this.d3el.classed(this.constructor.name, true);
  }
  draw () {
    this.drawCount = this.drawCount || 0;
    this.drawCount++;
    this.d3el.html(`TODO: view not implemented<br/>Draw called ${this.drawCount} times`);
  }
}

class ScrollableGoldenLayoutView extends GoldenLayoutView {
  setup () {
    super.setup();
    this.contentDiv = this.d3el.append('div')
      .classed('scrollArea', true);
  }
}

const EmptyStateMixin = (superclass) => class extends superclass {
  constructor (options) {
    super(options);
    this.emptyState = options.emptyState || 'img/noDataEmptyState.svg';
  }
  setup () {
    super.setup();
    this.d3el.append('img')
      .classed('emptyState', true)
      .attr('src', this.emptyState);
  }
  draw () {
    if (!this.drawEmptyState()) {
      super.draw();
    }
  }
  drawEmptyState () {
    const notEmpty = window.mainView.userSelection &&
      window.mainView.settings &&
      window.mainView.allDocItems &&
      window.mainView.allDocItems.length > 0;
    this.d3el.select('.emptyState').style('display', notEmpty ? 'none' : null);
    return !notEmpty;
  }
};

export { GoldenLayoutView, ScrollableGoldenLayoutView, EmptyStateMixin };
