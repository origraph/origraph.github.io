import ModalMenuOption from '../Common/ModalMenuOption.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class UploadOption extends ModelSubmenuMixin(ModalMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/upload.svg';
    this.label = 'Upload Data...';
    this.loading = false;
    this.loaded = false;
  }
  setup () {
    super.setup();
    this.uploadInput = this.contentDiv.append('input')
      .attr('type', 'file')
      .property('multiple', true)
      .style('display', 'none')
      .on('change', () => { this.uploadFiles(); });
    const loadContainer = this.contentDiv.append('div')
      .classed('loadContainer', true);
    this.uploadButton = loadContainer.append('div')
      .classed('button', true)
      .on('click', () => {
        if (!this.loading) {
          this.uploadInput.node().click();
        }
      });
    this.uploadButton.append('a');
    this.uploadButton.append('span')
      .text('Choose Files');
    this.spinner = loadContainer.append('img')
      .style('display', 'none')
      .attr('src', 'img/spinner.gif');
  }
  draw () {
    super.draw();
    this.spinner
      .style('display', (this.loading || this.loaded) ? null : 'none')
      .attr('src', this.loading ? 'img/spinner.gif' : 'img/check.svg');
    this.uploadButton.classed('disabled', this.loading);
  }
  async uploadFiles () {
    this.loading = true;
    this.loaded = false;
    this.render();
    this.loadedFiles = {};
    const fileList = Array.from(this.uploadInput.node().files);

    await Promise.all(fileList.map(async fileObj => {
      await this.model.addFileAsStaticTable({ fileObj });
      window.mainView.render();
    }));
    this.loading = false;
    this.loaded = true;
    this.render();
  }
}
export default UploadOption;
