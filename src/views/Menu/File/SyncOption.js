import { ModalMenuOption } from '../Menu.js';

class SyncOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/sync.svg';
    this.label = 'Sync Settings...';
  }
  setup () {
    super.setup();
    this.contentDiv.text('todo');
  }
}
export default SyncOption;
