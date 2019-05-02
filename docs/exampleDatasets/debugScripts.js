/* globals d3, origraph */
async function checkStage (stage, limit) {
  if (stage <= limit) {
    await window.mainView.handleModelChange();
    return false;
  } else {
    return true;
  }
}

window.prepMovies = async (stage = Infinity) => {
  const files = [
    'movies/movies.json',
    'movies/credits.json',
    'movies/people.json'
  ];
  const newModel = origraph.createModel({
    name: 'Debug Movies',
    annotations: { description: 'Movies dataset before connection' }
  });
  const classes = {};
  for (const filename of files) {
    const text = await d3.text(`docs/exampleDatasets/${filename}`);
    const newClass = await newModel.addTextFile({
      name: filename,
      text
    });
    classes[filename] = newClass;
  }

  if (!await checkStage(stage, 0)) { return; }

  let movies = classes['movies/movies.json'].interpretAsNodes();
  movies.setClassName('Movies');
  movies.setAnnotation('labelAttr', 'title');

  if (!await checkStage(stage, 1)) { return; }

  let cast = classes['movies/credits.json'].unroll('cast')
    .interpretAsEdges();
  cast.setClassName('Cast');
  cast.setAnnotation('labelAttr', 'character');
  let crew = classes['movies/credits.json'].unroll('crew')
    .interpretAsEdges();
  crew.setClassName('Crew');
  crew.setAnnotation('labelAttr', 'job');
  classes['movies/credits.json'].delete();

  if (!await checkStage(stage, 3)) { return; }

  let people = classes['movies/people.json'].interpretAsNodes();
  people.setClassName('People');
  people.setAnnotation('labelAttr', 'name');

  if (!await checkStage(stage, 4)) { return; }

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

  if (!await checkStage(stage, 5)) { return; }

  let bechdelTests = classes['movies/bechdeltest.json'].interpretAsNodes();
  bechdelTests.setClassName('Bechdel Tests');
  bechdelTests.table.deriveAttribute('tt_imdbid', item => 'tt' + item.row.imdbid);

  const hasScore = movies.connectToNodeClass({
    otherNodeClass: bechdelTests,
    attribute: 'imdb_id',
    otherAttribute: 'tt_imdbid'
  });
  hasScore.setClassName('Has Score');

  if (!await checkStage(stage, 6)) { return; }

  movies.table.deriveAttribute('Bechdel Score', async (movie) => {
    for await (const score of movie.edges({ classes: [hasScore] })) {
      for await (const bechdelTest of score.nodes({ classes: [bechdelTests] })) {
        return bechdelTest.row['rating'];
      }
    }
    return null;
  });
  movies.table.deriveAttribute('Cast Gender Bias', async (movie) => {
    let nWomen = 0;
    let nMen = 0;
    for await (const castEdge of movie.edges({ classes: [cast] })) {
      for await (const person of castEdge.nodes({ classes: [people] })) {
        let value = person.row['gender'];
        if (value === 1) {
          nWomen++;
        } else if (value === 2) {
          nMen++;
        }
      }
    }
    return nMen / (nWomen + nMen);
  });
  movies.table.deriveAttribute('Crew Gender Bias', async (movie) => {
    let nWomen = 0;
    let nMen = 0;
    for await (const crewEdge of movie.edges({ classes: [crew] })) {
      for await (const person of crewEdge.nodes({ classes: [people] })) {
        let value = person.row['gender'];
        if (value === 1) {
          nWomen++;
        } else if (value === 2) {
          nMen++;
        }
      }
    }
    return nMen / (nWomen + nMen);
  });

  await window.mainView.handleModelChange();
};

window.prepParallelEdgesAndNodes = async () => {
  const newModel = origraph.createModel({
    name: 'Debug Parallel Edges / Nodes',
    annotations: { description: 'Toy dataset for playing with topological rollups / supernodes' }
  });
  const baseClass = await newModel.addTextFile({
    name: 'parallelEdgesAndNodes.json',
    text: await d3.text('docs/exampleDatasets/parallelEdgesAndNodes.json')
  });
  let [ nodeClass, edgeClass ] = baseClass
    .closedTranspose(['nodes', 'edges']);
  nodeClass = nodeClass.interpretAsNodes();
  nodeClass.setAnnotation('labelAttr', 'value');
  nodeClass.setClassName('Nodes');
  edgeClass = edgeClass.interpretAsEdges();
  edgeClass.setClassName('Edges');
  edgeClass.connectToNodeClass({
    nodeClass,
    side: 'source',
    nodeAttribute: 'value',
    edgeAttribute: 'source'
  });
  edgeClass.connectToNodeClass({
    nodeClass,
    side: 'target',
    nodeAttribute: 'value',
    edgeAttribute: 'target'
  });
  baseClass.delete();

  await window.mainView.handleModelChange();
};

window.halfwayThroughSenate = async (stage = Infinity) => {
  const files = [
    'twitterPolitics/allContributions.json',
    'twitterPolitics/pressReleases.json',
    'twitterPolitics/senate_votes_yemen.json',
    'twitterPolitics/senateMembers.json',
    'twitterPolitics/senateTweets.json'
  ];
  const newModel = origraph.createModel({
    name: 'Debug Senate',
    annotations: { description: 'Senate dataset before projection' }
  });
  const classes = {};
  for (const filename of files) {
    const text = await d3.text(`docs/exampleDatasets/${filename}`);
    const newClass = await newModel.addTextFile({
      name: filename,
      text
    });
    classes[filename] = newClass;
  }

  // Y1
  if (!await checkStage(stage, 1)) { return; }

  const senators = classes['twitterPolitics/senateMembers.json']
    .interpretAsNodes();
  senators.setClassName('Senators');
  senators.setAnnotation('labelAttr', 'last_name');

  const pressReleases = classes['twitterPolitics/pressReleases.json']
    .interpretAsNodes();
  pressReleases.setClassName('Press Releases');

  const tweets = classes['twitterPolitics/senateTweets.json']
    .interpretAsNodes();
  tweets.setClassName('Tweets');

  let contribs = classes['twitterPolitics/allContributions.json']
    .interpretAsNodes();
  contribs.setClassName('Contributions');

  const votes = classes['twitterPolitics/senate_votes_yemen.json']
    .interpretAsNodes();
  votes.setClassName('Votes');

  // Y2
  if (!await checkStage(stage, 2)) { return; }

  let twitterAccounts = tweets.expand('user'); // Y3
  const projectedTwitterEdge = Array.from(twitterAccounts.edgeClasses())[0];

  // Y4
  if (!await checkStage(stage, 4)) { return; }

  const twitterSenatorLink = twitterAccounts.connectToNodeClass({
    otherNodeClass: senators,
    attribute: 'screen_name',
    otherAttribute: 'twitter_account'
  }); // Y5
  if (!await checkStage(stage, 5)) { return; }

  twitterAccounts = twitterAccounts.interpretAsEdges({ autoconnect: true }); // Y6
  if (!await checkStage(stage, 6)) { return; }
  projectedTwitterEdge.delete();
  twitterSenatorLink.delete();

  const contribSenatorEdge = contribs.connectToNodeClass({
    otherNodeClass: senators,
    attribute: 'candidate',
    otherAttribute: 'fec_candidate_id'
  });
  senators.connectToNodeClass({
    otherNodeClass: pressReleases,
    attribute: 'id',
    otherAttribute: 'member_id'
  }).setClassName('Released');

  // Y7
  if (!await checkStage(stage, 7)) { return; }

  const [ yesses, nos ] = votes
    .closedFacet('vote_position', ['Yes', 'No'])
    .map(classObj => classObj.interpretAsNodes());
  votes.delete();
  const yesVotes = senators.connectToNodeClass({
    otherNodeClass: yesses,
    attribute: 'id',
    otherAttribute: 'member_id'
  });
  yesVotes.setClassName('Voted');
  const noVotes = senators.connectToNodeClass({
    otherNodeClass: nos,
    attribute: 'id',
    otherAttribute: 'member_id'
  });
  noVotes.setClassName('Voted');

  // Y8
  if (!await checkStage(stage, 8)) { return; }

  const donorCommittees = contribs.promote('fec_committee_name'); // Y9
  if (!await checkStage(stage, 9)) { return; }
  donorCommittees.setClassName('Donor Committees');

  const donorContribEdge = Array.from(donorCommittees.edgeClasses())[0];
  contribs = contribs.interpretAsEdges({ autoconnect: true }); // Y10
  if (!await checkStage(stage, 10)) { return; }
  contribSenatorEdge.delete();
  donorContribEdge.delete();

  const [ contribsFor, contribsAgainst ] = contribs
    .closedFacet('support_or_oppose', [ 'S', 'O' ]); // Y11
  if (!await checkStage(stage, 11)) { return; }
  contribsFor.setClassName('Contributions For');
  contribsAgainst.setClassName('Contributions Against');
  contribs.delete();

  const contribForYes = donorCommittees.projectNewEdge([
    contribsFor.classId,
    senators.classId,
    yesVotes.classId,
    yesses.classId
  ]);
  contribForYes.setClassName('Contributions for Yes');
  const contribForNo = donorCommittees.projectNewEdge([
    contribsFor.classId,
    senators.classId,
    noVotes.classId,
    nos.classId
  ]);
  contribForNo.setClassName('Contributions for No');
  const contribAgainstYes = donorCommittees.projectNewEdge([
    contribsAgainst.classId,
    senators.classId,
    yesVotes.classId,
    yesses.classId
  ]);
  contribAgainstYes.setClassName('Contributions against Yes');
  const contribAgainstNo = donorCommittees.projectNewEdge([
    contribsAgainst.classId,
    senators.classId,
    noVotes.classId,
    nos.classId
  ]);
  contribAgainstNo.setClassName('Contributions against No');

  // Y12

  // (Y13 is in Gephi)

  // (Y14 is just a shot of the connect interface)

  // (Y15 is an UpSet plot)

  await window.mainView.handleModelChange();
};
