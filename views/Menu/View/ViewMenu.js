import SubMenu from '../Common/SubMenu.js';
import ViewMenuOption from '../Common/ViewMenuOption.js';

class ViewMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/view.svg';
    this.label = 'View';
    this.items = Object.keys(window.mainView.VIEW_CLASSES)
      .filter(className => className !== 'HelpView')
      .map(className => {
        return new ViewMenuOption(className, this);
      });
  }
}
export default ViewMenu;
