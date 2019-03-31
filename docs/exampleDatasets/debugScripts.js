/* globals d3, origraph */
window.prepConnectState = async () => {
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
  let movies = classes['movies/movies.json'].interpretAsNodes();
  movies.setClassName('Movies');
  movies.setAnnotation('labelAttr', 'title');

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

window.halfwayThroughSenate = async () => {
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

  let twitterAccounts = tweets.expand('user'); // Y3
  const projectedTwitterEdge = Array.from(twitterAccounts.edgeClasses())[0];

  // Y4

  const twitterSenatorLink = twitterAccounts.connectToNodeClass({
    otherNodeClass: senators,
    attribute: 'screen_name',
    otherAttribute: 'twitter_account'
  }); // Y5

  twitterAccounts = twitterAccounts.interpretAsEdges({ autoconnect: true }); // Y6
  projectedTwitterEdge.delete();
  twitterSenatorLink.delete();
/*
  const contribSenatorEdge = contribs.connectToNodeClass({
    otherNodeClass: senators,
    attribute: 'fec_candidate_id',
    otherAttribute: 'candidate'
  });
  senators.connectToNodeClass({
    otherNodeClass: pressReleases,
    attribute: 'id',
    otherAttribute: 'member_id'
  }).setClassName('Released');

  // Y7

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

  const donorCommittees = contribs.promote('fec_committee_name'); // Y9
  donorCommittees.setClassName('Donor Committees');

  const donorContribEdge = Array.from(donorCommittees.edgeClasses())[0];
  contribs = contribs.interpretAsEdges({ autoconnect: true }); // Y10
  contribSenatorEdge.delete();
  donorContribEdge.delete();

  const [ contribsFor, contribsAgainst ] = contribs
    .closedFacet('support_or_oppose', [ 'S', 'O' ]); // Y11
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

  */

  // Y12

  // (Y13 is in Gephi)

  // (Y14 is just a shot of the connect interface)

  // (Y15 is an UpSet plot)

  await window.mainView.handleModelChange();
};
