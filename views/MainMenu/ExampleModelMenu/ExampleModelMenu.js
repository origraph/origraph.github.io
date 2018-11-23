import SubMenu from '../Common/SubMenu.js';
import ExampleOption from './ExampleOption.js';

const EXAMPLE_MODELS = [
  {
    'name': 'Les Miserables',
    'icon': 'img/lesMiserables.svg',
    'description': 'Character co-occurrence',
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
  /* {
    'name': 'Movies',
    'icon': 'img/movies.svg',
    'description': 'TMDB movies, roles, companies, actors, and Bechdel ratings',
    'files': ['movies/bechdeltest.json'],
    'prefab': (model, classes) => {
      let people = classes['people.csv'];
      let movies = classes['movies.csv'];
      let movieEdges = classes['movieEdges.csv'];

      // Initial interpretation
      people = people.interpretAsNodes();
      people.setClassName('People');

      movies = movies.interpretAsNodes();
      movies.setClassName('Movies');

      movieEdges = movieEdges.interpretAsEdges();

      // Set up initial connections
      people.connectToEdgeClass({
        edgeClass: movieEdges,
        side: 'source',
        nodeAttribute: 'id',
        edgeAttribute: 'personID'
      });
      movieEdges.connectToNodeClass({
        nodeClass: movies,
        side: 'target',
        nodeAttribute: 'id',
        edgeAttribute: 'movieID'
      });
    }
  }, */
  {
    'name': 'Northwind',
    'icon': 'img/northwind.svg',
    'description': 'Fictional Nortwind Trading Co. dataset',
    'files': [
      'northwind/categories.csv',
      'northwind/customers.csv',
      'northwind/employees.csv',
      'northwind/employee_territories.csv',
      'northwind/order_details.csv',
      'northwind/orders.csv',
      'northwind/products.csv',
      'northwind/regions.csv',
      'northwind/shippers.csv',
      'northwind/suppliers.csv',
      'northwind/territories.csv'
    ],
    prefab: (model, classes) => {
      let employees = classes['northwind/employees.csv'].interpretAsNodes();
      employees.setClassName('Employees');

      let territories = classes['northwind/territories.csv'].interpretAsNodes();
      territories.setClassName('Territory');

      let employeeTerritories = classes['northwind/employee_territories.csv'].interpretAsEdges();
      employeeTerritories.setClassName('Employee Territory');

      let regions = classes['northwind/regions.csv'].interpretAsNodes();
      regions.setClassName('Regions');

      let customers = classes['northwind/customers.csv'].interpretAsNodes();
      customers.setClassName('Customers');

      let orders = classes['northwind/orders.csv'].interpretAsNodes();
      orders.setClassName('Orders');

      let orderDetails = classes['northwind/order_details.csv'].interpretAsEdges();
      orderDetails.setClassName('Order Details');

      let shippers = classes['northwind/shippers.csv'].interpretAsNodes();
      shippers.setClassName('Shippers');

      let products = classes['northwind/products.csv'].interpretAsNodes();
      products.setClassName('Products');

      let suppliers = classes['northwind/suppliers.csv'].interpretAsNodes();
      suppliers.setClassName('Suppliers');

      let categories = classes['northwind/categories.csv'].interpretAsNodes();
      categories.setClassName('Categories');

      employees.connectToEdgeClass({
        edgeClass: employeeTerritories,
        side: 'source',
        nodeAttribute: 'employeeID',
        edgeAttribute: 'employeeID'
      });
      territories.connectToEdgeClass({
        edgeClass: employeeTerritories,
        side: 'target',
        nodeAttribute: 'territoryID',
        edgeAttribute: 'territoryID'
      });
      regions.connectToNodeClass({
        otherNodeClass: territories,
        attribute: 'regionID',
        otherAttribute: 'regionID'
      }).setClassName('Territory Region');
      customers.connectToNodeClass({
        otherNodeClass: orders,
        attribute: 'customerID',
        otherAttribute: 'customerID'
      }).setClassName('Customer Orders');
      employees.connectToNodeClass({
        otherNodeClass: orders,
        attribute: 'employeeID',
        otherAttribute: 'employeeID'
      }).setClassName('Order Employee');
      shippers.connectToNodeClass({
        otherNodeClass: orders,
        attribute: 'shipperID',
        otherAttribute: 'shipVia'
      }).setClassName('Shipped Via');
      orderDetails.connectToNodeClass({
        nodeClass: orders,
        side: 'source',
        nodeAttribute: 'orderID',
        edgeAttribute: 'orderID'
      });
      orderDetails.connectToNodeClass({
        nodeClass: products,
        side: 'target',
        nodeAttribute: 'productID',
        edgeAttribute: 'productID'
      });
      products.connectToNodeClass({
        otherNodeClass: suppliers,
        attribute: 'supplierID',
        otherAttribute: 'supplierID'
      }).setClassName('Product Supplier');
      products.connectToNodeClass({
        otherNodeClass: categories,
        attribute: 'categoryID',
        otherAttribute: 'categoryID'
      }).setClassName('Product Category');
      suppliers.connectToNodeClass({
        otherNodeClass: territories,
        attribute: 'city',
        otherAttribute: 'territoryDescription'
      }).setClassName('Supplier Territory');
    }
  },
  {
    'name': 'Chinook',
    'icon': 'img/chinook.svg',
    'description': 'Fictional music store dataset',
    'files': [
      'chinook/albums.csv',
      'chinook/artists.csv',
      'chinook/customers.csv',
      'chinook/data.csv',
      'chinook/employees.csv',
      'chinook/genres.csv',
      'chinook/invoice_items.csv',
      'chinook/invoices.csv',
      'chinook/media_types.csv',
      'chinook/playlists.csv',
      'chinook/playlist_track.csv',
      'chinook/tracks.csv'
    ]
  },
  {
    'name': 'Air Travel',
    'icon': 'img/airplane.svg',
    'description': 'Airports and flights',
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
