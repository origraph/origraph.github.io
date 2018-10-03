/* globals origraph, d3 */
window.autoLoadMovies = async () => {
  const files = ['people.csv', 'movies.csv', 'movieEdges.csv'];
  const classes = await Promise.all(files.map(async filename => {
    const text = await d3.text(`docs/exampleDatasets/${filename}`);
    return origraph.addStringAsStaticTable({
      name: filename,
      extension: origraph.mime.extension(origraph.mime.lookup(filename)),
      text
    });
  }));

  const [ peopleId, moviesId, movieEdgesId ] = classes.map(classObj => classObj.classId);

  origraph.classes[peopleId].interpretAsNodes();
  origraph.classes[moviesId].interpretAsNodes();
  origraph.classes[movieEdgesId].interpretAsEdges();

  origraph.classes[peopleId].connectToEdgeClass({
    edgeClass: origraph.classes[movieEdgesId],
    side: 'source',
    nodeAttribute: 'id',
    edgeAttribute: 'sourceID'
  });
  origraph.classes[movieEdgesId].connectToNodeClass({
    nodeClass: origraph.classes[moviesId],
    side: 'target',
    nodeAttribute: 'id',
    edgeAttribute: 'targetID'
  });
  origraph.classes[movieEdgesId].toggleDirection();
};

window.autoLoadLesMiserables = async () => {
  const data = await d3.json('docs/exampleDatasets/miserables.json');
  const baseClassObj = origraph.addStaticTable({
    name: 'miserables.json',
    data
  });

  let [ nodeClass, edgeClass ] = baseClassObj.closedTranspose(['nodes', 'links']);
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
  baseClassObj.delete();
};
