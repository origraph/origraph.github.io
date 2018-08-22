import BaseMenu from './BaseMenu.js';

class CollapsibleMenu extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.expanded = false;
  }
  toggle (state = !this.expanded) {
    this.expanded = state;
    this.render();
  }
  setup () {
    super.setup();
    this.summary.on('click', () => {
      this.toggle();
    });
  }
  draw () {
    super.draw();
    this.summary.select('.button')
      .classed('selected', this.expanded);
  }
}
export default CollapsibleMenu;
