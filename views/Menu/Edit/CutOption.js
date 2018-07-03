import ActionMenuItem from '../Common/ActionMenuItem.js';

class CutOption extends ActionMenuItem {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/cut.svg';
    this.label = 'Cut';
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
export default CutOption;
