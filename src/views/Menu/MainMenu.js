/* globals d3 */
import { SubMenu, ViewMenuOption } from './Menu.js';
import FileMenu from './File/FileMenu.js';
import EditMenu from './Edit/EditMenu.js';
import ViewMenu from './View/ViewMenu.js';

class MainMenu extends SubMenu {
  constructor (d3el) {
    super(null, d3el);
    this.icon = 'img/hamburger.svg';
    this.label = 'Menu';
    this.items = [
      new FileMenu(this),
      new EditMenu(this),
      new ViewMenu(this),
      // Show the help menu item at the root level:
      new ViewMenuOption('HelpView', this)
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
