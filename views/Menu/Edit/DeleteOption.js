import ActionMenuItem from '../Common/ActionMenuItem.js';

class DeleteOption extends ActionMenuItem {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/delete.svg';
    this.label = 'Delete';
  }
  get enabled () {
    // TODO
    return false;
  }
  executeAction () {
    // TODO
    console.warn('todo');
  }
}
export default DeleteOption;
