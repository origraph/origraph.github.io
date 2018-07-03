import ActionMenuItem from '../Common/ActionMenuItem.js';

class UndoOption extends ActionMenuItem {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/undo.svg';
    this.label = 'Undo';
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
export default UndoOption;
