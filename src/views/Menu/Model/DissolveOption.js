import { ModalMenuOption } from '../Menu.js';

class DissolveOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/dissolve.svg';
  }
  get label () {
    // TODO: Dynamically change to Hyperedges, apply the (s) dynamically
    return 'Dissolve Supernode(s)...';
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
export default DissolveOption;
