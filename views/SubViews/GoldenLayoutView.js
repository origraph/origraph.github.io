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
    this._icon = icon;
    this.container.setTitle(label);
    this.container.on('tab', tab => {
      this.tabElement = d3.select(tab.element[0]);
      this.setupTab();
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
  get icon () {
    return this._icon;
  }
  setup () {
    this.d3el.classed(this.constructor.name, true);
    this.emptyStateDiv = this.d3el.append('div')
      .classed('emptyState', true)
      .style('display', 'none');
    this.content = this.setupContentElement(this.d3el);
  }
  setupTab () {
    this.tabElement.classed(this.constructor.name, true);
    this.tabElement.insert('div', ':first-child')
      .classed('lm_tab_icon', true)
      .classed('viewIcon', true)
      .style('background-image', `url(${this.icon})`);
  }
  drawTab () {
    // Should be overridden
  }
  setupContentElement () {
    // Default setup is a scrollable div; SvgViewMixin overrides this
    return this.d3el.append('div')
      .classed('scrollArea', true);
  }
  draw () {
    this.emptyStateDiv.style('display', this.isEmpty() ? null : 'none');
    if (this.tabElement) {
      this.drawTab();
    }
  }
}

export default GoldenLayoutView;
