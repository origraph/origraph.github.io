/* globals mure */
import ModalMenuOption from '../Common/ModalMenuOption.js';

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
  async uploadFiles () {
    this.spinner.style('display', null);
    const fileList = Array.from(this.uploadInput.node().files);
    const fileSelections = await Promise.all(fileList.map(fileObj => {
      return mure.uploadFileObj(fileObj);
    }));
    const unifiedSelection = fileSelections.reduce((agg, selection) => {
      if (!agg) {
        return selection;
      } else {
        return agg.merge(selection);
      }
    }, null);
    await window.mainView.setUserSelection(unifiedSelection);
    this.spinner.style('display', 'none');
  }
}
export default UploadOption;
