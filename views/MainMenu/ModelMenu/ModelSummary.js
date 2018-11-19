/* globals d3 */
import ModalMenuOption from '../Common/ModalMenuOption.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class ProjectSummary extends ModelSubmenuMixin(ModalMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/annotate.svg';
    this.label = 'Model Info';
  }
  setup () {
    super.setup();
    this.projectNameField = this.contentDiv.append('input')
      .property('value', this.model.name)
      .on('change', () => {
        const newName = this.projectNameField.property('value');
        if (newName) {
          this.model.rename(newName);
        }
      });
    this.descriptionField = this.contentDiv.append('textarea')
      .property('value', this.model.annotations.description || '')
      .attr('placeholder', 'Add a description here')
      .on('change', () => {
        const annotation = this.descriptionField.property('value');
        if (annotation) {
          this.model.annotate('description', annotation);
        } else {
          this.model.deleteAnnotation('description');
        }
      });
    this.fileList = this.contentDiv.append('div');
  }
  draw () {
    const self = this;
    if (!super.draw()) {
      return;
    }

    this.projectNameField.property('value', this.model.name);
    this.descriptionField.property('value', this.model.annotations.description || '');

    // TODO: do a more complete summary of all tables and their associated
    // classes?
    const tableList = d3.entries(this.model.tables)
      .filter(({ key, value }) => value.type === 'Static');

    let files = this.fileList.selectAll('.file')
      .data(tableList, d => d.key);
    files.exit().remove();
    const filesEnter = files.enter().append('div')
      .classed('file', true);
    files = filesEnter.merge(files);

    filesEnter.append('span').classed('filename', true);
    files.select('.filename').text(d => d.value.name);

    filesEnter.append('div').classed('button', true)
      .append('a')
      .append('img').attr('src', 'img/hamburger.svg');
    files.select('.button')
      .on('click', function (d) {
        window.mainView.showTableContextMenu({
          modelId: self.model.modelId,
          tableId: d.value.tableId,
          targetBounds: this.getBoundingClientRect()
        });
      });
  }
}
export default ProjectSummary;
