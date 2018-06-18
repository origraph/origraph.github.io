import { SubMenu } from '../Menu.js';
import ConnectOption from './ConnectOption.js';
import MergeEdgeOption from './MergeEdgeOption.js';
import DissolveOption from './DissolveOption.js';
import CreateClassOption from './CreateClassOption.js';
import PromoteOption from './PromoteOption.js';

class ModelMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/networkModel.svg';
    this.label = 'Model';
    this.items = [
      new ConnectOption(this),
      new MergeEdgeOption(this),
      new DissolveOption(this),
      new CreateClassOption(this),
      new PromoteOption(this)
    ];
  }
}
export default ModelMenu;
