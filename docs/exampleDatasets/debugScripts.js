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
};
