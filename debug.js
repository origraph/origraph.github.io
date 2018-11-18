/* globals origraph, d3 */
window.autoLoadMovies = async () => {
  const files = ['people.csv', 'movies.csv', 'movieEdges.csv'];
  const classes = await Promise.all(files.map(async filename => {
    const text = await d3.text(`docs/exampleDatasets/${filename}`);
    return origraph.currentModel.addStringAsStaticTable({
      name: filename,
      text
    });
  }));

  const [ peopleId, moviesId, movieEdgesId ] = classes.map(classObj => classObj.classId);

  origraph.currentModel.classes[peopleId].interpretAsNodes();
  origraph.currentModel.classes[moviesId].interpretAsNodes();
  origraph.currentModel.classes[movieEdgesId].interpretAsEdges();

  origraph.currentModel.classes[peopleId].connectToEdgeClass({
    edgeClass: origraph.currentModel.classes[movieEdgesId],
    side: 'source',
    nodeAttribute: 'id',
    edgeAttribute: 'sourceID'
  });
  origraph.currentModel.classes[movieEdgesId].connectToNodeClass({
    nodeClass: origraph.currentModel.classes[moviesId],
    side: 'target',
    nodeAttribute: 'id',
    edgeAttribute: 'targetID'
  });
  origraph.currentModel.classes[movieEdgesId].toggleDirection();
};

window.autoLoadLesMiserables = async () => {
  const data = await d3.json('docs/exampleDatasets/miserables.json');
  const baseClassObj = origraph.currentModel.addStaticTable({
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
