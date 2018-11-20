/* globals origraph */
import ActionMenuOption from '../Common/ActionMenuOption.js';
import DisableableOptionMixin from '../Common/DisableableOptionMixin.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class ActivateOption extends ModelSubmenuMixin(DisableableOptionMixin(ActionMenuOption)) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/packageOpen.svg';
    this.label = 'Open';
  }
  async executeAction () {
    origraph.currentModel = this.model;
  }
  isEnabled () {
    return origraph.currentModel !== this.model;
  }
}
export default ActivateOption;
