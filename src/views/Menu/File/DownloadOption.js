import { ModalMenuOption } from '../Menu.js';

class DownloadOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/download.svg';
    this.label = 'Download Selection As...';
  }
  setup () {
    super.setup();
    const row = this.contentDiv.append('div').classed('row', true);
    row.text('todo');
  }
}
export default DownloadOption;
