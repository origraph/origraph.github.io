import { Menu } from './Menu.js';
import UploadOption from './UploadOption.js';

class FileMenu extends Menu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/disk.svg';
    this.label = 'File';
    this.items = [
      new UploadOption(this)
    ];
  }
}
export default FileMenu;
