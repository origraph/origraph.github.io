import SubMenu from '../Common/SubMenu.js';
import NewFileOption from './NewFileOption.js';
import UploadOption from './UploadOption.js';
import ExampleFileOption from './ExampleFileOption.js';
import DownloadOption from './DownloadOption.js';
import SyncOption from './SyncOption.js';

class FileMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/disk.svg';
    this.label = 'File';
    this.items = [
      new NewFileOption(this),
      new UploadOption(this),
      new ExampleFileOption(this),
      new SyncOption(this),
      new DownloadOption(this)
    ];
  }
}
export default FileMenu;
