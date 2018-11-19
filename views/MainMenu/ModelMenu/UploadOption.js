import ModalMenuOption from '../Common/ModalMenuOption.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class UploadOption extends ModelSubmenuMixin(ModalMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/upload.svg';
    this.label = 'Upload Data...';
  }
  setup () {
    super.setup();
    this.uploadInput = this.contentDiv.append('input')
      .attr('type', 'file')
      .property('multiple', true)
      .style('display', 'none')
      .on('change', () => { this.uploadFiles(); });
    this.uploadButton = this.contentDiv.append('div')
      .classed('button', true)
      .on('click', () => this.uploadInput.node().click());
    this.uploadButton.append('a');
    this.uploadButton.append('span')
      .text('Choose Files');
  }
  async uploadFiles () {
    this.loadedFiles = {};
    const fileList = Array.from(this.uploadInput.node().files);

    await Promise.all(fileList.map(async fileObj => {
      await this.model.addFileAsStaticTable({ fileObj });
      window.mainView.render();
    }));
  }
}
export default UploadOption;
