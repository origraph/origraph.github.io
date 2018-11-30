import SubMenu from '../Common/SubMenu.js';
import ExampleOption from './ExampleOption.js';

const EXAMPLE_MODELS = [
  {
    'name': 'Les Miserables',
    'icon': 'img/lesMiserables.svg',
    'description': 'Character co-occurrence (<a target="_blank" href="https://gist.github.com/mbostock/f584aa36df54c451c94a9d0798caed35#file-miserables-json">source</a>)',
    'files': ['miserables.json'],
    prefab: (model, classes) => {
      let [ nodeClass, edgeClass ] = classes['miserables.json']
        .closedTranspose(['nodes', 'links']);
      nodeClass = nodeClass.interpretAsNodes();
      nodeClass.setClassName('nodes');
      edgeClass = edgeClass.interpretAsEdges();
      edgeClass.setClassName('edges');
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
    'name': 'Northwind',
    'icon': 'img/northwind.svg',
    'description': 'Fictional Nortwind Trading Co. dataset (<a target="_blank" href="https://github.com/graphql-compose/graphql-compose-examples/tree/master/examples/northwind/data/csv">source</a>)',
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
    'description': 'Fictional music store dataset (<a target="_blank" href="https://archive.codeplex.com/?p=chinookdatabase">source</a>)',
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
    'name': 'Movies',
    'icon': 'img/movies.svg',
    'description': '<a target="_blank" href="https://www.themoviedb.org">TMDB</a> movies, roles, companies, actors, and <a target="_blank" href="https://bechdeltest.com/">Bechdel ratings</a>',
    'files': [
      'movies/movies.json',
      'movies/credits.json',
      'movies/companies.json',
      'movies/people.json'
    ],
    prefab: (model, classes) => {
      let movies = classes['movies/movies.json'].interpretAsNodes();
      movies.setClassName('Movies');

      let [ cast, crew ] = classes['movies/credits.json']
        .closedTranspose(['cast', 'crew']);
      classes['movies/credits.json'].delete();

      cast = cast.interpretAsEdges();
      cast.setClassName('Cast');

      crew = crew.interpretAsEdges();
      crew.setClassName('Crew');

      let people = classes['movies/people.json'].interpretAsNodes();
      people.setClassName('People');

      let companies = classes['movies/companies.json'].aggregate('name');
      companies = companies.interpretAsNodes();
      companies.setClassName('Companies');

      let produced = classes['movies/companies.json'].interpretAsEdges();
      produced.setClassName('Produced');

      // let companies = companyLinks

      cast.connectToNodeClass({
        nodeClass: movies,
        side: 'target',
        nodeAttribute: 'id',
        edgeAttribute: 'movie_id'
      });
      cast.connectToNodeClass({
        nodeClass: people,
        side: 'source',
        nodeAttribute: 'id',
        edgeAttribute: 'id'
      });
      crew.connectToNodeClass({
        nodeClass: movies,
        side: 'target',
        nodeAttribute: 'id',
        edgeAttribute: 'movie_id'
      });
      crew.connectToNodeClass({
        nodeClass: people,
        side: 'source',
        nodeAttribute: 'id',
        edgeAttribute: 'id'
      });
      produced.connectToNodeClass({
        nodeClass: companies,
        side: 'source',
        nodeAttribute: null,
        edgeAttribute: 'name'
      });
      produced.connectToNodeClass({
        nodeClass: movies,
        side: 'target',
        nodeAttribute: 'id',
        edgeAttribute: 'movie_id'
      });
    }
  },
  {
    'name': 'Panama Papers',
    'icon': 'img/panama.svg',
    'description': 'Panama papers dataset (<a target="_blank" href="https://offshoreleaks.icij.org/pages/database">source</a>)',
    'files': [
      'panama/address.csv',
      'panama/edges.csv',
      'panama/entity.csv',
      'panama/intermediary.csv',
      'panama/officer.csv'
    ]
  },
  {
    'name': 'Air Travel',
    'icon': 'img/airplane.svg',
    'description': 'Airports and flights (todo: source?)',
    'files': [
      'flights/airports.csv',
      'flights/flights-airport.csv'
    ]
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
