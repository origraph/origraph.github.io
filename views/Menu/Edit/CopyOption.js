import ActionMenuItem from '../Common/ActionMenuItem.js';

class CopyOption extends ActionMenuItem {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/copy.svg';
    this.label = 'Copy';
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
export default CopyOption;
