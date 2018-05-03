/* globals d3 */
import { View } from '../lib/uki.esm.js';

class GoldenLayoutView extends View {
  constructor (container, title) {
    super(null);
    this.container = container;
    this.container.setTitle(title);
    this.container.on('open', () => {
      this.render(d3.select(this.container.getElement()[0]));
    });
    this.container.on('show', () => this.render());
    this.container.on('resize', () => this.render());
  }
  setup () {
    this.d3el.text('TODO: view not implemented');
  }
  draw () {}
}
export default GoldenLayoutView;
