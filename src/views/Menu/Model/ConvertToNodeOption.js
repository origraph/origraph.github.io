import { ActionMenuOption } from '../Menu.js';

class ConvertToNodeOption extends ActionMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/node.svg';
  }
  get label () {
    // TODO: "Derive" in some instances, apply the (s) dynamically
    return 'Convert to Node(s)';
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
export default ConvertToNodeOption;
