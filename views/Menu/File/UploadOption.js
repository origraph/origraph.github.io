/* globals mure */
import { ModalMenuOption } from '../Menu.js';

class UploadOption extends ModalMenuOption {
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
    this.spinner = this.contentDiv.append('img')
      .style('display', 'none')
      .attr('width', '18px')
      .attr('height', '18px')
      .attr('src', 'img/spinner.gif');
  }
  uploadFiles () {
    this.spinner.style('display', null);
    const fileList = Array.from(this.uploadInput.node().files);
    const remainingFiles = {};
    const finishFile = mureFile => {
      delete remainingFiles[mureFile.filename];
      if (Object.keys(remainingFiles).length === 0) {
        this.spinner.style('display', 'none');
        mure.off('docChange', finishFile);
      }
    };
    fileList.forEach(fileObj => {
      remainingFiles[fileObj.name] = true;
      mure.uploadFileObj(fileObj);
    });
    mure.on('docChange', finishFile);
  }
}
export default UploadOption;
