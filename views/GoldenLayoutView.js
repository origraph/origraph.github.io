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
    this.contentDiv = this.d3el.append('div')
      .classed('scrollArea', true);
    this.overlay = this.d3el.append('div')
      .classed('overlay', true);
    this.overlay.append('img')
      .attr('src', 'img/spinner.gif')
      .classed('spinner', true);
  }
  draw () {
    this.showSpinner();
    (async () => {
      if (await this.isEmpty()) {
        this._wasEmpty = true;
        await this.drawEmptyState();
      } else {
        if (this._wasEmpty) {
          this.clearEmptyState();
        }
        this._wasEmpty = false;
        await this.drawReadyState();
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
  async isEmpty () {
    const temp = await window.mainView.allDocsPromise;
    return !(window.mainView.userSelection &&
      window.mainView.settings &&
      temp && temp.length > 0);
  }
  drawEmptyState () {
    this.contentDiv.html('<img class="emptyState" src="img/noDataEmptyState.svg"/>');
  }
  clearEmptyState () {
    this.contentDiv.html('');
  }
  drawReadyState () {
    this.drawCount = this.drawCount || 0;
    this.drawCount++;
    this.d3el.html(`TODO: view not implemented<br/>Draw called ${this.drawCount} times`);
  }
}

export default GoldenLayoutView;
