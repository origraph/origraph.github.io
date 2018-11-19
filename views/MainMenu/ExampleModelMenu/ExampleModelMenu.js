import SubMenu from '../Common/SubMenu.js';
import ExampleOption from './ExampleOption.js';

const EXAMPLE_MODELS = [
  {
    'name': 'Les Miserables',
    'icon': 'img/lesMiserables.svg',
    'description': 'This is the classic JSON graph, connecting characters when they co-occur. Maybe you can improve on it?',
    'files': ['miserables.json'],
    'prefab': (model, classes) => {
      let [ nodeClass, edgeClass ] = classes['miserables.json']
        .closedTranspose(['nodes', 'links']);
      nodeClass = nodeClass.interpretAsNodes();
      edgeClass = edgeClass.interpretAsEdges();
      edgeClass.connectToNodeClass({
        nodeClass,
        side: 'source',
        nodeAttribute: 'index',
        edgeAttribute: 'source'
      });
      edgeClass.connectToNodeClass({
        nodeClass,
        side: 'target',
        nodeAttribute: 'index',
        edgeAttribute: 'target'
      });
      classes['miserables.json'].delete();
    }
  },
  {
    'name': 'Movies',
    'icon': 'img/movies.svg',
    'description': 'This is Neo4j\'s example film dataset, connecting people and movies.',
    'files': ['people.csv', 'movies.csv', 'movieEdges.csv']
  },
  {
    'name': 'Air Travel',
    'icon': 'img/airplane.svg',
    'description': 'This is the classic airport + flights dataset. For those of you that like breaking academic research tools with too much data.',
    'files': ['airports.csv', 'flights-airport.csv']
  }
];

class ExampleFileOption extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/guidedTour.svg';
    this.label = 'Load Example Model...';
    this.items = EXAMPLE_MODELS.map(example => {
      return new ExampleOption(this, null, example);
    });
  }
}
export default ExampleFileOption;
