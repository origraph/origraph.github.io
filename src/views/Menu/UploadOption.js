import { MenuOption } from './Menu.js';

class UploadOption extends MenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/upload.svg';
    this.label = 'Upload';
  }
  setup () {
    super.setup();
    this.contentDiv.text('todo: upload stuff');
  }
}
export default UploadOption;
