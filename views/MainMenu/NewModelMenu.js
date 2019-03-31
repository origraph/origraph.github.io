/* globals origraph */
import ActionMenuOption from './Common/ActionMenuOption.js';

class NewModelMenu extends ActionMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/packageNew.svg';
    this.label = 'Create New Model';
  }
  executeAction () {
    origraph.createModel();
    window.mainView.handleModelChange();
  }
}
export default NewModelMenu;
