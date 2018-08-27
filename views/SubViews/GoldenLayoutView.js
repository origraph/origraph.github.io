/* globals d3 */
import { View } from '../../node_modules/uki/dist/uki.esm.js';

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
      this.tabElement = d3.select(tab.element[0]);
    });
    this.container.on('open', () => {
      this.render(d3.select(this.container.getElement()[0]));
    });
    this.container.on('show', () => this.render());
    this.container.on('resize', () => this.render());
  }
  get id () {
    return this.constructor.name;
  }
  setup () {
    this.d3el.classed(this.constructor.name, true);
    this.emptyStateDiv = this.d3el.append('div')
      .classed('emptyState', true)
      .style('display', 'none');
    this.content = this.setupContentElement(this.d3el);
  }
  setupContentElement () {
    // Default setup is a scrollable div; SvgViewMixin overrides this
    return this.d3el.append('div')
      .classed('scrollArea', true);
  }
  draw () {
    this.emptyStateDiv.style('display', this.isEmpty() ? null : 'none');
  }
}

export default GoldenLayoutView;
