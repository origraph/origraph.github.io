import { ModalMenuOption } from '../Menu.js';

class SyncOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/sync.svg';
    this.label = 'Sync Settings...';
  }
  setup () {
    super.setup();
    const row = this.contentDiv.append('div').classed('row', true);
    row.text('todo');
  }
}
export default SyncOption;
