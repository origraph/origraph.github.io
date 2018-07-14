/* globals mure */
import SubMenu from '../Common/SubMenu.js';
import SubViewMenu from './SubViewMenu.js';
import ViewMenuOption from './ViewMenuOption.js';

class ViewMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/view.svg';
    this.label = 'View';

    const viewClassNames = [
      'FileView',
      'TableView',
      'AttributeSummaryView',
      'NetworkModelView'
    ];

    this.rootSubMenu = new SubViewMenu({
      parentMenu: this,
      label: 'Home',
      icon: 'img/home.svg',
      items: []
    });
    this.rootSubMenu.items = viewClassNames.map((className, index) => {
      let getLocation;
      if (className === 'NetworkModelView') {
        getLocation = () => mure.selectAll('@ $.classes[*]')
          .pivot({ context: 'NavigateToMembers' });
      } else {
        getLocation = () => mure.selectAll('@ $');
      }
      return new ViewMenuOption({
        parentMenu: this.rootSubMenu,
        ViewClass: window.VIEW_CLASSES[className],
        getLocation
      });
    });
    this.selectionSubMenu = new SubViewMenu({
      parentMenu: this,
      label: 'Selection',
      icon: 'img/select.svg',
      items: []
    });
    this.selectionSubMenu.items = viewClassNames.map(className => {
      return new ViewMenuOption({
        parentMenu: this.selectionSubMenu,
        ViewClass: window.VIEW_CLASSES[className],
        getLocation: () => window.mainView.userSelection
      });
    });

    this.activeViewSubMenu = new SubViewMenu({
      parentMenu: this,
      label: 'Active Views',
      icon: 'img/check.svg',
      items: []
    });
    this.activeViewSubMenu.items = Object.values(window.mainView.views)
      .map(viewInstance => { return this.getActiveViewMenuOption(viewInstance); });

    this.items = [
      this.rootSubMenu,
      this.selectionSubMenu,
      this.activeViewSubMenu
    ];
  }
  getActiveViewMenuOption (viewInstance) {
    let temp = {
      parentMenu: this.activeViewSubMenu,
      ViewClass: viewInstance.constructor
    };
    if (viewInstance.location) {
      temp.getLocation = () => viewInstance.location;
    }
    return new ViewMenuOption(temp);
  }
  updateActiveItemlist () {
    let items = {};
    this.activeViewSubMenu.d3el.select(':scope > .submenu')
      .selectAll(':scope > .menuOption')
      .each(d => {
        if (window.mainView.views[d.id]) {
          items[d.id] = d;
        }
      });
    Object.entries(window.mainView.views).forEach(([id, viewInstance]) => {
      if (!items[id]) {
        items[id] = this.getActiveViewMenuOption(viewInstance);
      }
    });
    return Object.values(items);
  }
  draw () {
    this.activeViewSubMenu.items = this.updateActiveItemlist();
    super.draw();
  }
}
export default ViewMenu;
