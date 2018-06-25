/* globals d3, mure */
import { SubMenu, ViewMenuOption } from './Menu.js';
import FileMenu from './File/FileMenu.js';
import EditMenu from './Edit/EditMenu.js';
import ViewMenu from './View/ViewMenu.js';
import OperationMenuGenerator from './Operations/OperationMenuGenerator.js';
// import ConvertMenu from './Convert/ConvertMenu.js';
// import ModelMenu from './Model/ModelMenu.js';

class MainMenu extends SubMenu {
  constructor (d3el) {
    super(null, d3el);
    this.icon = 'img/hamburger.svg';
    this.label = 'Menu';
    // Generate the operation menus
    const operationMenus = Object.entries(mure.OPERATIONS)
      .map(([opFamilyName, opFamilyObj]) => {
        const OperationMenu = OperationMenuGenerator(`img/${opFamilyName}.svg`, opFamilyName, opFamilyObj);
        return new OperationMenu(this);
      });
    this.items = [
      new FileMenu(this),
      new EditMenu(this),
      new ViewMenu(this),
      // Operation menus:
      ...operationMenus,
      // Show the help menu item at the root level:
      new ViewMenuOption('HelpView', this)
    ];
    this.hideContents = false;
  }
  setup () {
    super.setup();
    // Don't show a separator for the root menu
    this.d3el.select(':scope > hr').remove();
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
