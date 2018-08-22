import SubMenu from '../Common/SubMenu.js';
import UploadOption from './UploadOption.js';
import ExampleFileOption from './ExampleFileOption.js';
import DownloadOption from './DownloadOption.js';

class FileMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/disk.svg';
    this.label = 'File';
    this.items = [
      new UploadOption(this),
      new ExampleFileOption(this),
      new DownloadOption(this)
    ];
  }
}
export default FileMenu;
