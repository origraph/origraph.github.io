import ModalMenuOption from '../Common/ModalMenuOption.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class DownloadOption extends ModelSubmenuMixin(ModalMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/download.svg';
    this.label = 'Download All Data...';
  }
  setup () {
    super.setup();
    this.contentDiv.text('todo');
  }
}
export default DownloadOption;
