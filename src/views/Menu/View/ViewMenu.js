import { SubMenu, CheckableMenuOption } from '../Menu.js';

class ViewMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/view.svg';
    this.label = 'View';
    this.items = Object.entries(window.mainView.VIEW_CLASSES)
      .map(([className, ClassObj]) => {
        const temp = new CheckableMenuOption(this);
        Object.defineProperty(temp, 'checked', { get: () => {
          return window.mainView.isShowingSubView(className);
        }});
        temp.toggle = (state) => {
          window.mainView.toggleSubView(className);
        };
        temp.icon = ClassObj.icon;
        temp.label = ClassObj.label;
        return temp;
      });
  }
}
export default ViewMenu;
