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

  await mure.classes[peopleId].interpretAsNodes();
  await mure.classes[moviesId].interpretAsNodes();
  await mure.classes[movieEdgesId].interpretAsEdges();

  await mure.classes[peopleId].connectToEdgeClass({
    edgeClass: mure.classes[movieEdgesId],
    direction: 'source',
    nodeAttribute: 'id',
    edgeAttribute: 'sourceID'
  });
  await mure.classes[movieEdgesId].connectToNodeClass({
    nodeClass: mure.classes[moviesId],
    direction: 'target',
    nodeAttribute: 'id',
    edgeAttribute: 'targetID'
  });
};

window.autoLoadLesMiserables = async () => {
  const data = await d3.json('docs/exampleDatasets/miserables.json');
  const baseClassObj = mure.addStaticTable({
    name: 'miserables.json',
    data
  });

  let [ nodeClass, edgeClass ] = baseClassObj.closedTranspose(['nodes', 'links']);
  nodeClass = await nodeClass.interpretAsNodes();
  edgeClass = await edgeClass.interpretAsEdges();
  /*
  await edgeClass.connectToNodeClass({
    nodeClass,
    direction: 'source',
    nodeAttribute: 'index',
    edgeAttribute: 'source'
  });
  await edgeClass.connectToNodeClass({
    nodeClass,
    direction: 'target',
    nodeAttribute: 'index',
    edgeAttribute: 'target'
  });
  */
  baseClassObj.delete();
};
