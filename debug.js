/* globals mure, d3 */
window.autoLoadMovies = async () => {
  const files = ['people.csv', 'movies.csv', 'movieEdges.csv'];
  const classes = await Promise.all(files.map(async filename => {
    const text = await d3.text(`docs/exampleDatasets/${filename}`);
    return mure.addStringAsStaticTable({
      name: filename,
      extension: mure.mime.extension(mure.mime.lookup(filename)),
      text
    });
  }));

  const [ peopleId, moviesId, movieEdgesId ] = classes.map(classObj => classObj.classId);

  mure.classes[peopleId].interpretAsNodes();
  mure.classes[moviesId].interpretAsNodes();
  mure.classes[movieEdgesId].interpretAsEdges();

  mure.classes[peopleId].connectToEdgeClass({
    edgeClass: mure.classes[movieEdgesId],
    side: 'source',
    nodeAttribute: 'id',
    edgeAttribute: 'sourceID'
  });
  mure.classes[movieEdgesId].connectToNodeClass({
    nodeClass: mure.classes[moviesId],
    side: 'target',
    nodeAttribute: 'id',
    edgeAttribute: 'targetID'
  });
  mure.classes[movieEdgesId].toggleDirection();
};

window.autoLoadLesMiserables = async () => {
  const data = await d3.json('docs/exampleDatasets/miserables.json');
  const baseClassObj = mure.addStaticTable({
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
