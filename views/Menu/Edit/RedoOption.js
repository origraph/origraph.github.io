import ActionMenuOption from '../Common/ActionMenuOption.js';

class RedoOption extends ActionMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/redo.svg';
    this.label = 'Redo';
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
export default RedoOption;
