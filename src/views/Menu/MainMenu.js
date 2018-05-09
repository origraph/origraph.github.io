/* globals d3 */
import { BaseMenu } from './Menu.js';
import FileMenu from './File/FileMenu.js';

class MainMenu extends BaseMenu {
  constructor (d3el) {
    super(null, d3el);
    this.icon = 'img/hamburger.svg';
    this.label = 'Menu';
    this.items = [
      new FileMenu(this)
    ];
    this.expanded = false;
  }
  toggle () {
    this.expanded = !this.expanded;
    this.render();
  }
  setup () {
    this.summary = this.d3el.append('div');
    super.setup();
    this.summary.on('click', () => {
      this.toggle();
    });
  }
  draw () {
    super.draw();
    const wasSquished = d3.select('#contents').classed('squished');
    d3.select('#contents').classed('squished', this.expanded);
    if (wasSquished !== this.expanded) {
      window.mainView.resize();
    }
  }
}
export default MainMenu;
