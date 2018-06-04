import { ActionMenuOption } from '../Menu.js';

class ConvertToEdgeOption extends ActionMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/edge.svg';
  }
  get label () {
    // TODO: Apply the (s) dynamically
    return 'Convert to Edge(s)';
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
export default ConvertToEdgeOption;
