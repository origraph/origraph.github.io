export default [
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
        nodeClass: products,
        side: 'source',
        nodeAttribute: 'productID',
        edgeAttribute: 'productID'
      });
      orderDetails.connectToNodeClass({
        nodeClass: orders,
        side: 'target',
        nodeAttribute: 'orderID',
        edgeAttribute: 'orderID'
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
    'description': '<a target="_blank" href="https://www.themoviedb.org">TMDB</a> movies, people, credits, and <a target="_blank" href="https://bechdeltest.com/">Bechdel tests</a>',
    'files': [
      'movies/movies.json',
      'movies/people.json',
      'movies/credits.json',
      'movies/bechdeltest.json'
    ],
    prefab: (model, classes) => {
      let movies = classes['movies/movies.json'].interpretAsNodes();
      movies.setClassName('Movies');
      movies.setAnnotation('labelAttr', 'title');

      let produced = movies.unroll('production_companies');
      produced.setClassName('Produced By');

      let companies = produced.promote('name');
      companies.setClassName('Companies');

      let tempEdges = Array.from(produced.edgeClasses());
      produced = produced.interpretAsEdges({ autoconnect: true });
      for (const edgeClass of tempEdges) {
        edgeClass.delete();
      }

      let cast = classes['movies/credits.json'].unroll('cast')
        .interpretAsEdges();
      cast.setClassName('Cast');
      cast.setAnnotation('labelAttr', 'character');
      let crew = classes['movies/credits.json'].unroll('crew')
        .interpretAsEdges();
      crew.setClassName('Crew');
      crew.setAnnotation('labelAttr', 'job');
      classes['movies/credits.json'].delete();

      let people = classes['movies/people.json'].interpretAsNodes();
      people.setClassName('People');
      people.setAnnotation('labelAttr', 'name');

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

      let bechdelTests = classes['movies/bechdeltest.json'].interpretAsNodes();
      bechdelTests.setClassName('Bechdel Tests');
      bechdelTests.table.deriveAttribute('tt_imdbid', item => 'tt' + item.row.imdbid);

      movies.connectToNodeClass({
        otherNodeClass: bechdelTests,
        attribute: 'imdb_id',
        otherAttribute: 'tt_imdbid'
      }).setClassName('Has Score');
    }
  },
  {
    'name': 'Twitter, Politics',
    'icon': 'img/politics.svg',
    'description': 'Data extracted from <a href="https://www.propublica.org/datastore/datasets/politics">ProPublica\'s</a> and <a href="https://developer.twitter.com">Twitter\'s</a> APIs related to US involvement in the 2018 Saudi Arabia / Yemen conflict',
    'files': [
      'twitterPolitics/allContributions.json',
      'twitterPolitics/pressReleases.json',
      'twitterPolitics/senate_votes_yemen.json',
      'twitterPolitics/senateMembers.json',
      'twitterPolitics/senateTweets.json'
    ],
    prefab: async (model, classes) => {
      const senators = classes['twitterPolitics/senateMembers.json']
        .interpretAsNodes();
      senators.setClassName('Senators');
      senators.setAnnotation('labelAttr', 'last_name');

      const contribs = classes['twitterPolitics/allContributions.json']
        .interpretAsEdges();

      contribs.connectToNodeClass({
        nodeClass: senators,
        side: 'target',
        nodeAttribute: 'fec_candidate_id',
        edgeAttribute: 'candidate'
      });

      const donorCommittees = contribs.promote('fec_committee_name');
      donorCommittees.setClassName('Donor Committees');

      const [ contribsFor, contribsAgainst ] = contribs
        .closedFacet('support_or_oppose', [ 'S', 'O' ]);
      contribsFor.setClassName('Contributions For');
      contribsAgainst.setClassName('Contributions Against');
      contribs.delete();

      const pressReleases = classes['twitterPolitics/pressReleases.json']
        .interpretAsNodes();
      pressReleases.setClassName('Press Releases');

      senators.connectToNodeClass({
        otherNodeClass: pressReleases,
        attribute: 'id',
        otherAttribute: 'member_id'
      }).setClassName('Released');

      const [ yesses, nos ] = classes['twitterPolitics/senate_votes_yemen.json']
        .closedFacet('vote_position', ['Yes', 'No'])
        .map(classObj => classObj.interpretAsNodes());
      classes['twitterPolitics/senate_votes_yemen.json'].delete();

      senators.connectToNodeClass({
        otherNodeClass: yesses,
        attribute: 'id',
        otherAttribute: 'member_id'
      }).setClassName('Voted');
      senators.connectToNodeClass({
        otherNodeClass: nos,
        attribute: 'id',
        otherAttribute: 'member_id'
      }).setClassName('Voted');

      const tweets = classes['twitterPolitics/senateTweets.json']
        .interpretAsNodes();
      tweets.setClassName('Tweets');

      let twitterAccounts = tweets.expand('user');

      twitterAccounts.connectToNodeClass({
        otherNodeClass: senators,
        attribute: 'screen_name',
        otherAttribute: 'twitter_account'
      });

      const intermediateClasses = [ twitterAccounts ];
      for (const edgeClass of twitterAccounts.edgeClasses()) {
        if (twitterAccounts.getEdgeRole(edgeClass) === 'source') {
          intermediateClasses.unshift(edgeClass);
        } else {
          intermediateClasses.push(edgeClass);
        }
      }
      const tweeted = senators.projectNewEdge(intermediateClasses
        .map(classObj => classObj.classId)
        .concat([tweets.classId]));
      tweeted.setClassName('Tweeted');
      for (const classObj of intermediateClasses) {
        classObj.delete();
      }
    }
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
