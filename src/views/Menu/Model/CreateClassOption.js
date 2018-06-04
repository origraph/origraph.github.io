import { ModalMenuOption } from '../Menu.js';

class CreateClassOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/createClass.svg';
  }
  get label () {
    // TODO: Change to "assign" dynamically
    return 'Create New Class...';
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
export default CreateClassOption;
