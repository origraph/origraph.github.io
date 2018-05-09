import { DetailsMenu } from '../Menu.js';
import UploadOption from './UploadOption.js';
import DownloadOption from './DownloadOption.js';
import SyncOption from './SyncOption.js';

class FileMenu extends DetailsMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/disk.svg';
    this.label = 'File';
    this.items = [
      new UploadOption(this),
      new SyncOption(this),
      new DownloadOption(this)
    ];
  }
}
export default FileMenu;
