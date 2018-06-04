import { ModalMenuOption } from '../Menu.js';

class PromoteOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.label = 'Promote Unique Values to Nodes...';
    this.icon = 'img/promote.svg';
  }
  get enabled () {
    // TODO
    return false;
  }
  setup () {
    super.setup();
    this.contentDiv.text('todo');
  }
}
export default PromoteOption;
