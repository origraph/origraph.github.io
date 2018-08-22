/* globals d3 */
import SubMenu from './Common/SubMenu.js';
import CollapsibleMenu from './Common/CollapsibleMenu.js';

import FileMenu from './File/FileMenu.js';

class MainMenu extends SubMenu {
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
    // Don't show a separator for the root menu
    this.d3el.select(':scope > hr').remove();
  }
  draw () {
    CollapsibleMenu.prototype.draw.call(this);
    const wasSquished = d3.select('#contents').classed('squished');
    d3.select('#contents').classed('squished', this.expanded);
    d3.select('#menu').classed('expanded', this.expanded);
    if (wasSquished !== this.expanded) {
      window.mainView.resize();
    }
    this.drawItems();
  }
}
export default MainMenu;
