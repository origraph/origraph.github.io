import SubMenu from '../Common/SubMenu.js';
import ExampleOption from './ExampleOption.js';
import ExampleModels from '../../../docs/exampleDatasets/ExampleModels.js';

class ExampleFileOption extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/guidedTour.svg';
    this.label = 'Load Example Model...';
    this.items = ExampleModels.map(example => {
      return new ExampleOption(this, null, example);
    });
  }
}
export default ExampleFileOption;
