/* globals d3 */
import MainView from './views/MainView.js';
import * as SUBVIEW_CLASSES from './views/SubViews/SubViews.js';

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

window.onload = () => {
  window.mainView = new MainView(d3.select('body'));
};
window.onresize = () => {
  if (window.mainView) {
    window.mainView.resize();
  }
};
