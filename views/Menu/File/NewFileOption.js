import { ModalMenuOption } from '../Menu.js';

class NewFileOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/newDocument.svg';
    this.label = 'New File...';
  }
  setup () {
    super.setup();
    this.contentDiv.text('todo');
  }
}
export default NewFileOption;
