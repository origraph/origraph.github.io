import { DisableableOptionMixin, ActionMenuOption } from '../Menu.js';

class NavigateOption extends DisableableOptionMixin(ActionMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/navigate.svg';
    this.label = 'Navigate to Selection';
  }
  executeAction () {
    if (window.mainView.userSelection) {
      window.mainView.setNavigationContext(window.mainView.userSelection.selectorList);
    }
  }
  isEnabled () {
    return !!window.mainView.userSelection;
  }
}
export default NavigateOption;
