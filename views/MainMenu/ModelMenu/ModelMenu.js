/* globals origraph */
import SubMenu from '../Common/SubMenu.js';
import ActivateOption from './ActivateOption.js';
import ModelSummary from './ModelSummary.js';
import UploadOption from './UploadOption.js';
import DownloadOption from './DownloadOption.js';
import DeleteOption from './DeleteOption.js';

class ModelMenu extends SubMenu {
  constructor (parentMenu, d3el, modelId) {
    super(parentMenu, d3el);
    this.modelId = modelId;
    this.items = [
      new ActivateOption(this),
      new ModelSummary(this),
      new UploadOption(this),
      new DownloadOption(this),
      new DeleteOption(this)
    ];
  }
  get id () {
    return this.modelId;
  }
  get icon () {
    return this.model === origraph.currentModel ? 'img/packageOpen.svg'
      : 'img/package.svg';
  }
  get label () {
    return this.model ? this.model.name : '';
  }
  get model () {
    return origraph.models[this.modelId];
  }
}
export default ModelMenu;
