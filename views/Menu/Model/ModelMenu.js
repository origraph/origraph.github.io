import SubMenu from '../Common/SubMenu.js';
import ConvertOption from './ConvertOption.js';
import AssignClassOption from './AssignClassOption.js';
import ConnectOption from './ConnectOption.js';

class ModelMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/networkModel.svg';
    this.label = 'Model';
    this.items = [
      new ConvertOption(this),
      new AssignClassOption(this),
      new ConnectOption(this)
    ];
  }
}
export default ModelMenu;
