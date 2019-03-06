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
