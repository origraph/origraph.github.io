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
    this.icon = window.mainView.VIEW_CLASSES[ViewClass.name].icon;
    this.label = window.mainView.VIEW_CLASSES[ViewClass.name].label;
  }
  get id () {
    let id = this.ViewClass.name;
    let location = this.getLocation && this.getLocation();
    if (location) {
      id += location.hash;
    }
    return id;
  }
  get checked () {
    return !!window.mainView.views[this.id];
  }
  toggle (state) {
    let location = this.getLocation && this.getLocation();
    window.mainView.toggleSubView(this.ViewClass, location, state);
  }
}
export default ViewMenuOption;
