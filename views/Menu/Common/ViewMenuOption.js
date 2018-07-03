import CheckableMenuOption from './CheckableMenuOption.js';

class ViewMenuOption extends CheckableMenuOption {
  constructor (className, parentMenu, d3el) {
    super(parentMenu, d3el);
    this.className = className;
    this.icon = window.mainView.VIEW_CLASSES[className].icon;
    this.label = window.mainView.VIEW_CLASSES[className].label;
  }
  get checked () {
    return window.mainView.isShowingSubView(this.className);
  }
  toggle (state) {
    window.mainView.toggleSubView(this.className);
  }
}
export default ViewMenuOption;
