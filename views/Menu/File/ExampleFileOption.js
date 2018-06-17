import { ModalMenuOption } from '../Menu.js';

const EXAMPLE_FILES = [
  'miserables.json',
  'airports.csv',
  'flights-airport.csv',
  'MIDA_4.01.csv',
  'MIDB_4.01.csv',
  'narratives_1993-2001.csv',
  'narratives_2002-2010.csv'
];

class ExampleFileOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/exampleFiles.svg';
    this.label = 'Load Example File...';
  }
  setup () {
    super.setup();
    const dropdown = this.contentDiv.append('select');
    let options = dropdown.selectAll('option').data(EXAMPLE_FILES);
    options.exit().remove();
    options = options.enter().append('option').merge(options);

    options.text(d => d);
    dropdown.on('change', function () {
      window.mainView.loadExampleFile(this.value);
    });
  }
}
export default ExampleFileOption;
