/* globals d3, origraph */
import ModalMenuOption from '../Common/ModalMenuOption.js';

const EXAMPLE_FILES = [
  'Pick a file:',
  'miserables.json',
  'airports.csv',
  'flights-airport.csv',
  'people.csv',
  'movies.csv',
  'movieEdges.csv'
];

class ExampleFileOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/boilerplate.svg';
    this.label = 'Load Example File...';
  }
  setup () {
    super.setup();
    const dropdown = this.contentDiv.append('select');
    let options = dropdown.selectAll('option').data(EXAMPLE_FILES);
    options.exit().remove();
    options = options.enter().append('option').merge(options);

    options.text(d => d)
      .attr('disabled', (d, i) => i === 0 ? '' : null);
    dropdown.on('change', async function () {
      let text;
      try {
        text = await d3.text(`docs/exampleDatasets/${this.value}`);
      } catch (err) {
        window.mainView.alert(err.message);
      }
      await origraph.addStringAsStaticTable({
        key: this.value,
        extension: origraph.mime.extension(origraph.mime.lookup(this.value)),
        name: this.value,
        text
      });
      window.mainView.render();
    });
  }
}
export default ExampleFileOption;
