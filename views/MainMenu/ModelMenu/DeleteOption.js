import ActionMenuOption from '../Common/ActionMenuOption.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class DeleteOption extends ModelSubmenuMixin(ActionMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/delete.svg';
    this.label = 'Delete';
  }
  async executeAction () {
    const message = `Are you sure you want to delete "${this.model.name}"?`;
    if (await window.mainView.confirm(message) === true) {
      window.mainView.instanceGraph.purge();
      this.model.delete();
    }
  }
}
export default DeleteOption;
