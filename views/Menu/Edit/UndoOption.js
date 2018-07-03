import ActionMenuOption from '../Common/ActionMenuOption.js';

class UndoOption extends ActionMenuOption {
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
