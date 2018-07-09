import CheckableMenuOption from '../Common/CheckableMenuOption.js';

class ViewMenuOption extends CheckableMenuOption {
  constructor ({
    parentMenu,
    ViewClass,
    getLocation,
    d3el
  }) {
    super(parentMenu, d3el);
    this.ViewClass = ViewClass;
    this.getLocation = getLocation;
    this.icon = window.VIEW_CLASSES[ViewClass.name].icon;
    this.label = window.VIEW_CLASSES[ViewClass.name].label;
  }
  async getId () {
    let id = this.ViewClass.name;
    let location = this.getLocation && await this.getLocation();
    if (location) {
      id += location.hash;
    }
    return id;
  }
  async isChecked () {
    return !!window.mainView.views[await this.getId()];
  }
  async toggle (state) {
    let location = this.getLocation && await this.getLocation();
    window.mainView.toggleSubView(this.ViewClass, location, state);
  }
}
export default ViewMenuOption;
