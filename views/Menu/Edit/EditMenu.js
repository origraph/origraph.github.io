import SubMenu from '../Common/SubMenu.js';
import UndoOption from './UndoOption.js';
import RedoOption from './RedoOption.js';
import CutOption from './CutOption.js';
import CopyOption from './CopyOption.js';
import PasteOption from './PasteOption.js';
import DeleteOption from './DeleteOption.js';

class EditMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/edit.svg';
    this.label = 'Edit';
    this.items = [
      new UndoOption(this),
      new RedoOption(this),
      new CutOption(this),
      new CopyOption(this),
      new PasteOption(this),
      new DeleteOption(this)
    ];
  }
}
export default EditMenu;
