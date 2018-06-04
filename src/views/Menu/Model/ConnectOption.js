import { ModalMenuOption } from '../Menu.js';

class ConnectOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/connect.svg';
  }
  get label () {
    // TODO: Dynamically change nodes to edges and/or contents;
    // Apply the (s) dynamically
    return 'Connect Node(s)';
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
export default ConnectOption;
