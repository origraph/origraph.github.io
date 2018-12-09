/* globals jQuery, download */
import ModalMenuOption from '../Common/ModalMenuOption.js';
import ModelSubmenuMixin from './ModelSubmenuMixin.js';

class DownloadOption extends ModelSubmenuMixin(ModalMenuOption) {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/download.svg';
    this.label = 'Download...';
  }
  get includeClasses () {
    return jQuery(this.contentDiv.select('#classes').node()).serializeArray()
      .map(({ name }) => this.model.classes[name]);
  }
  get currentOptions () {
    const options = {};
    jQuery(this.contentDiv.select('#options').node()).serializeArray()
      .forEach(({ name, value }) => {
        options[name] = value;
      });
    return options;
  }
  async download () {
    const options = this.currentOptions;
    options.format = this.formatSelect.node().value;
    options.includeClasses = this.includeClasses;
    if (options.includeClasses.length > 0) {
      const { data, type, extension } = await this.model.formatData(options);
      download(data, `${this.model.name}.${extension}`, type);
    }
  }
  setup () {
    super.setup();
    this.contentDiv.classed('downloadOption', true).html(`\
      <select id="format">
        <option value="D3Json">D3.js-style JSON</option>
        <option value="CsvZip">Zipped CSV Files</option>
      </select>
      <details>
        <summary>Options</summary>
        <form id="options"></form>
      </details>
      <details>
        <summary>Select Classes</summary>
        <form id="classes"></form>
      </details>
      <div class="download button"><a></a><span>Download</span></div>
    `);
    this.formatSelect = this.contentDiv.select('#format')
      .on('change', () => { this.switchFormat(); });
    this.downloadButton = this.contentDiv.select('.download.button');
    this.downloadButton.on('click', () => { this.download(); });
    this.switchFormat();
  }
  switchFormat () {
    const format = this.formatSelect.node().value;
    if (format === 'D3Json') {
      this.contentDiv.select('#options').html(`
        <label for="pretty">
          <input id="pretty" name="pretty" type="radio" value="true" checked/>
          Pretty
        </label>
        <label for="compact">
          <input id="compact" name="pretty" type="radio" value=""/>
          Compact
        </label>
        <label for="nodeAttribute">
          Node Attribute:
          <input id="nodeAttribute" name="nodeAttribute" placeholder="(use index)"/>
        </label>
        <label for="sourceAttribute">
          Source Attribute:
          <input id="sourceAttribute" name="sourceAttribute" value="source"/>
        </label>
        <label for="targetAttribute">
          Target Attribute:
          <input id="targetAttribute" name="targetAttribute" value="target"/>
        </label>
        <label for="classAttribute">
          Class Attribute:
          <input id="classAttribute" name="classAttribute" placeholder="(don't store)"/>
        </label>
      `);
    } else if (format === 'CsvZip') {
      this.contentDiv.select('#options').html(`
        <label for="indexName">
          <input id="indexName" name="indexName" value="index"/>
          Index attribute name
        </label>
      `);
    }
  }
  draw () {
    if (!super.draw()) {
      return;
    }

    let classes = this.contentDiv.select('#classes').selectAll('label')
      .data(Object.values(this.model.classes), classObj => classObj.classId);
    classes.exit().remove();
    const classesEnter = classes.enter().append('label');
    classes = classes.merge(classesEnter);

    classesEnter.append('input')
      .attr('type', 'checkbox')
      .property('checked', true)
      .attr('name', classObj => classObj.classId)
      .attr('value', classObj => classObj.classId);
    classesEnter.append('span');
    classes.select('span').text(classObj => classObj.className)
      .style('color', classObj => `#${classObj.annotations.color}`);

    classes.on('change', () => { this.render(); });
    this.downloadButton.classed('disabled', this.includeClasses.length === 0);
  }
}
export default DownloadOption;
