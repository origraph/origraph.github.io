/* globals d3 */
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
          componentState: {}
        }]
      }, {
        type: 'row',
        content: [{
          type: 'stack',
          // TODO: by default, we want to stack tables here (what to do when
          // there isn't any data loaded yet?)
          content: [{
            type: 'component',
            componentName: 'TableView',
            componentState: {}
          }]
        }, {
          type: 'component',
          componentName: 'InstanceView',
          componentState: {}
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
