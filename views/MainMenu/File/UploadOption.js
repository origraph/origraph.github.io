/* globals mure */
import ModalMenuOption from '../Common/ModalMenuOption.js';

class UploadOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/upload.svg';
    this.label = 'Upload Data...';
    this.lastFiles = [];
    this.loadedFiles = {};
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

    this.contentDiv.append('div')
      .classed('lastFiles', true);
  }
  draw () {
    super.draw();
    const lastFileContainer = this.contentDiv.select('.lastFiles')
      .style('display', this.lastFiles.length === 0 ? 'none' : null);

    if (this.lastFiles.length > 0) {
      let lastFiles = lastFileContainer.selectAll('.file')
        .data(this.lastFiles, d => d.name);
      lastFiles.exit().remove();
      let lastFilesEnter = lastFiles.enter().append('div')
        .classed('file', true);
      lastFiles = lastFiles.merge(lastFilesEnter);

      lastFilesEnter.append('span')
        .classed('filename', true);
      lastFiles.select('.filename').text(d => d.name);

      lastFilesEnter.append('img')
        .classed('spinner', true);
      lastFiles.select('.spinner')
        .attr('src', d => this.loadedFiles[d.name] ? 'img/check.svg' : 'img/spinner.gif');
    }
  }
  async uploadFiles () {
    this.loadedFiles = {};
    this.lastFiles = Array.from(this.uploadInput.node().files);
    this.render();

    await Promise.all(this.lastFiles.map(async fileObj => {
      await mure.addFileAsStaticDataSource({ fileObj });
      this.loadedFiles[fileObj.name] = true;
      window.mainView.render();
    }));
    // TODO: auto-select the new classes?
  }
}
export default UploadOption;
