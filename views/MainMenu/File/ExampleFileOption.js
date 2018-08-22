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
    dropdown.on('change', function () {
      window.mainView.loadExampleFile(this.value);
    });
  }
}
export default ExampleFileOption;
