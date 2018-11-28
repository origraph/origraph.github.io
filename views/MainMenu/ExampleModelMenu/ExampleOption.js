/* globals d3, origraph */
import ModalMenuOption from '../Common/ModalMenuOption.js';

class ExampleOption extends ModalMenuOption {
  constructor (parentMenu, d3el, { name, icon, description, files, prefab }) {
    super(parentMenu, d3el);
    this.icon = icon;
    this.label = name;
    this.description = description;
    this.files = files;
    this.prefab = prefab;
    this.loading = false;
    this.loaded = false;
  }
  setup () {
    super.setup();

    this.contentDiv.classed('example', true);

    this.contentDiv.append('p').classed('description', true)
      .html(this.description);

    const idBase = this.label.replace(/[A-Z\s]/g, '');

    const prefab = this.contentDiv.append('div')
      .classed('fabOption', true)
      .classed('disabled', !this.prefab);
    const prefabLabel = prefab.append('label')
      .attr('for', idBase + 'prefab');
    prefabLabel.append('input')
      .attr('name', idBase)
      .attr('id', idBase + 'prefab')
      .attr('type', 'radio')
      .attr('value', 'prefab')
      .property('checked', !!this.prefab)
      .property('disabled', !this.prefab);
    prefabLabel.append('img')
      .attr('src', 'img/prefab.svg');
    prefabLabel.append('span').text('Pre-assembled');
    /* prefab.append('p').text(`Start with the data connected, because
      Origraph's interface is new and / or confusing (note to
      Eurovis reviewers: we were careful to avoid usability claims
      in the paper. That's future work!).`); */

    const nofab = this.contentDiv.append('div')
      .classed('fabOption', true);
    const nofabLabel = nofab.append('label')
      .attr('for', idBase + 'nofab');
    nofabLabel.append('input')
      .attr('name', idBase)
      .attr('id', idBase + 'nofab')
      .attr('type', 'radio')
      .attr('value', 'nofab')
      .property('checked', !this.prefab);
    nofabLabel.append('img')
      .attr('src', 'img/nofab.svg');
    nofabLabel.append('span').text('Some assembly required');
    /* nofab.append('p').text(`Just load the data as-is,
      because you don't need no thought control.`); */

    const loadButtonContainer = this.contentDiv.append('div')
      .classed('loadContainer', true);

    this.loadButton = loadButtonContainer.append('div')
      .classed('button', true);
    this.spinner = loadButtonContainer.append('img');
    this.loadButton.append('span').text('Load');
    this.loadButton.on('click', async () => {
      if (!this.loaded && !this.loading) {
        this.loaded = false;
        this.loading = true;
        this.render();
        const newModel = origraph.createModel({
          name: this.label,
          annotations: { description: this.description }
        });
        const classes = {};
        for (const filename of this.files) {
          const text = await d3.text(`docs/exampleDatasets/${filename}`);
          const newClass = newModel.addStringAsStaticTable({
            key: filename,
            name: filename,
            text
          });
          classes[filename] = newClass;
        }
        if (prefabLabel.select('input').property('checked')) {
          this.prefab(newModel, classes);
        }
        this.loaded = true;
        this.render();
      }
    });
  }
  draw () {
    super.draw();
    this.spinner
      .style('display', this.loading || this.loaded ? null : 'none')
      .attr('src', this.loaded ? 'img/check.svg' : 'img/spinner.gif');
    this.loadButton.classed('disabled', this.loaded || this.loading);
  }
}
export default ExampleOption;
