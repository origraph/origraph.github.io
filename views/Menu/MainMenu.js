/* globals d3 */
import SubMenu from './Common/SubMenu.js';
import CollapsibleMenu from './Common/CollapsibleMenu.js';
import ViewMenuOption from './View/ViewMenuOption.js';

import FileMenu from './File/FileMenu.js';
import EditMenu from './Edit/EditMenu.js';
import ViewMenu from './View/ViewMenu.js';
import SelectMenu from './Select/SelectMenu.js';
import ModelMenu from './Model/ModelMenu.js';

import HelpView from '../HelpView.js';

class MainMenu extends SubMenu {
  constructor (d3el) {
    super(null, d3el);
    this.icon = 'img/hamburger.svg';
    this.label = 'Menu';
    this.items = [
      new FileMenu(this),
      new EditMenu(this),
      new SelectMenu(this),
      new ModelMenu(this),
      new ViewMenu(this),
      new ViewMenuOption({
        parentMenu: this,
        ViewClass: HelpView
      })
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
