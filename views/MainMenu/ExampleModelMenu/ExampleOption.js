/* globals d3, origraph */
import ModalMenuOption from '../Common/ModalMenuOption.js';

class ExampleOption extends ModalMenuOption {
  constructor (parentMenu, d3el, { name, icon, description, files, prefab }) {
    super(parentMenu, d3el);
    this.icon = icon;
    this.label = name;
    this.description = description;
    this.files = files;
    this.prefab = prefab || function () {
      window.mainView.alert(`Sorry, prefab for ${name} hasn't been implemented yet.`);
    };
  }
  setup () {
    super.setup();

    this.contentDiv.classed('example', true);

    this.contentDiv.append('p').classed('description', true)
      .text(this.description);

    const idBase = this.label.replace(/[A-Z\s]/g, '');

    const prefab = this.contentDiv.append('div')
      .classed('fabOption', true);
    const prefabLabel = prefab.append('label')
      .attr('for', idBase + 'prefab');
    prefabLabel.append('input')
      .attr('name', idBase)
      .attr('id', idBase + 'prefab')
      .attr('type', 'radio')
      .attr('value', 'prefab')
      .property('checked', true);
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
      .attr('value', 'nofab');
    nofabLabel.append('img')
      .attr('src', 'img/nofab.svg');
    nofabLabel.append('span').text('Some assembly required');
    /* nofab.append('p').text(`Just load the data as-is,
      because you don't need no thought control.`); */

    const loadButton = this.contentDiv.append('div')
      .classed('button', true);
    loadButton.append('span').text('Load');
    loadButton.on('click', async () => {
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
    });
  }
}
export default ExampleOption;
