/* globals origraph */
import ActionMenuOption from '../Common/ActionMenuOption.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class ActivateOption extends ModelSubmenuMixin(ActionMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/packageOpen.svg';
    this.label = 'Open';
  }
  async executeAction () {
    origraph.currentModel = this.model;
  }
}
export default ActivateOption;
