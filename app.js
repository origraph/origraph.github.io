/* globals d3, mure */
import MainView from './views/MainView.js';
import * as MODALS from './views/Modals/Modals.js';
import * as SUBVIEW_CLASSES from './views/SubViews/SubViews.js';

window.MODALS = MODALS;
window.SUBVIEW_CLASSES = SUBVIEW_CLASSES;

window.DEFAULT_LAYOUT = {
  content: [
    {
      type: 'column',
      content: [{
        type: 'row',
        content: [{
          type: 'component',
          componentName: 'NetworkModelView',
          componentState: {},
          isClosable: false
        }]
      }, {
        type: 'row',
        content: [{
          type: 'stack',
          content: [{
            type: 'component',
            componentName: 'TableView',
            componentState: {
              // An empty TableView
              classId: null
            },
            isClosable: false
          }]
        }, {
          type: 'component',
          componentName: 'InstanceView',
          componentState: {},
          isClosable: false
        }]
      }]
    }
  ]
};

window.autoLoad = async () => {
  // Load files
  const files = ['people.csv', 'movies.csv', 'movieEdges.csv'];
  const classes = await Promise.all(files.map(async filename => {
    const text = await d3.text(`docs/exampleDatasets/${filename}`);
    return mure.addStringAsStaticDataSource({
      key: filename,
      extension: mure.mime.extension(mure.mime.lookup(filename)),
      text
    });
  }));

  const [ peopleId, moviesId, movieEdgesId ] = classes.map(classObj => classObj.classId);

  await mure.classes[peopleId].interpretAsNodes();
  await mure.classes[moviesId].interpretAsNodes();
  await mure.classes[movieEdgesId].interpretAsEdges();

  mure.classes[peopleId].addHashFunction('id', function * (wrappedItem) {
    yield wrappedItem.rawItem.id;
  });
  mure.classes[moviesId].addHashFunction('id', function * (wrappedItem) {
    yield wrappedItem.rawItem.id;
  });
  mure.classes[movieEdgesId].addHashFunction('sourceId', function * (wrappedItem) {
    yield wrappedItem.rawItem.sourceId;
  });
  mure.classes[movieEdgesId].addHashFunction('targetId', function * (wrappedItem) {
    yield wrappedItem.rawItem.targetId;
  });

  await mure.classes[peopleId].connectToEdgeClass({
    edgeClass: mure.classes[movieEdgesId],
    direction: 'source',
    nodeHashName: 'id',
    edgeHashName: 'sourceId'
  });
  await mure.classes[movieEdgesId].connectToNodeClass({
    nodeClass: mure.classes[moviesId],
    direction: 'target',
    nodeHashName: 'id',
    edgeHashName: 'targetId'
  });
};

window.onload = () => {
  window.mainView = new MainView(d3.select('body'));
};
window.onresize = () => {
  if (window.mainView) {
    window.mainView.resize();
  }
};
