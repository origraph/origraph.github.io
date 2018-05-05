/* globals d3 */
import { Menu } from './Menu.js';
import FileMenu from './FileMenu.js';

class MainMenu extends Menu {
  constructor (d3el) {
    super(null, d3el);
    this.icon = 'img/hamburger.svg';
    this.label = 'Menu';
    this.items = [
      new FileMenu(this)
    ];
  }
  setup () {
    super.setup();
    // Important: this overrides the SubMenu toggle event listener
    this.d3el.on('toggle', () => {
      d3.select('#contents').classed('squished', this.d3el.node().open);
      window.mainView.resize();
    });
  }
  draw () {
    super.draw();
    this.d3el.select('summary').select('label')
      .style('display', this.expanded ? null : 'none');
  }
}
export default MainMenu;
