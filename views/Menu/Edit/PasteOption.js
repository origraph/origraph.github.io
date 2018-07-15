import ActionMenuOption from '../Common/ActionMenuOption.js';

class PasteOption extends ActionMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/paste.svg';
    this.label = 'Paste';
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
export default PasteOption;
