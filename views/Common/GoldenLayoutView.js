/* globals d3 */
import { View } from '../../node_modules/uki/dist/uki.esm.js';

class GoldenLayoutView extends View {
  constructor (container, {
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
    this.emptyStateDiv = this.d3el.append('div')
      .classed('emptyState', true);
    this.content = this.setupContentElement(this.d3el);
    this.overlay = this.d3el.append('div')
      .classed('overlay', true);
    this.overlay.append('img')
      .attr('src', 'img/spinner.gif')
      .classed('spinner', true);
  }
  setupContentElement () {
    return this.d3el.append('div')
      .classed('scrollArea', true);
  }
  draw () {
    this.showSpinner();
    (async () => {
      const emptyStateFunc = await this.getEmptyState();
      if (emptyStateFunc) {
        this.emptyStateDiv.style('display', null);
        this.content.style('display', 'none');
        await emptyStateFunc(this.emptyStateDiv);
      } else {
        this.emptyStateDiv.style('display', 'none');
        this.content.style('display', null);
        await this.drawReadyState(this.content);
      }
      this.hideSpinner();
    })();
  }
  showSpinner () {
    this.overlay.style('display', null);
  }
  hideSpinner () {
    this.overlay.style('display', 'none');
  }
  async getEmptyState () {
    if (!window.mainView.userSelection || !window.mainView.settings) {
      // In either of these cases, there will be a global spinner, so this one
      // is reduntant
      return () => { this.hideSpinner(); };
    }
    return null;
  }
  drawReadyState (content) {
    this.drawCount = this.drawCount || 0;
    this.drawCount++;
    this.content.html(`TODO: view not implemented<br/>Draw called ${this.drawCount} times`);
  }
}

export default GoldenLayoutView;
