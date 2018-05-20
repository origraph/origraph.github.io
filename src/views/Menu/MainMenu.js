/* globals d3 */
import { SubMenu } from './Menu.js';
import FileMenu from './File/FileMenu.js';
import EditMenu from './Edit/EditMenu.js';

class MainMenu extends SubMenu {
  constructor (d3el) {
    super(null, d3el);
    this.icon = 'img/hamburger.svg';
    this.label = 'Menu';
    this.items = [
      new FileMenu(this),
      new EditMenu(this)
    ];
    this.hideContents = false;
  }
  draw () {
    super.draw();
    const wasSquished = d3.select('#contents').classed('squished');
    d3.select('#contents').classed('squished', this.expanded);
    d3.select('#menu').classed('expanded', this.expanded);
    if (wasSquished !== this.expanded) {
      window.mainView.resize();
    }
  }
}
export default MainMenu;
