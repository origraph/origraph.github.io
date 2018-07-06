/* globals d3 */
import MainView from './views/MainView.js';

import Workspace from './views/Common/Workspace.js';

import NetworkModelView from './views/NetworkModelView.js';
import FileView from './views/FileView.js';
import TableView from './views/TableView.js';
import AttributeSummaryView from './views/AttributeSummaryView.js';
import HelpView from './views/HelpView.js';
import CsvNodeTourView from './views/GuidedTours/CsvNodeTourView.js';

window.VIEW_CLASSES = {
  FileView,
  NetworkModelView,
  TableView,
  AttributeSummaryView,
  HelpView,
  CsvNodeTourView
};

window.SLICE_MODES = {
  intersections: 'intersections',
  union: 'union'
};

window.WORKSPACES = {
  intro: new Workspace(),
  modeling: new Workspace({
    goldenLayoutConfig: {
      content: [
        {
          type: 'column',
          content: [{
            type: 'row',
            content: [{
              type: 'component',
              componentName: 'NetworkModelView',
              componentState: {}
            }, {
              type: 'component',
              componentName: 'InstanceView',
              componentState: {}
            }]
          }, {
            type: 'row',
            content: [{
              type: 'component',
              componentName: 'TableView',
              componentState: {}
            }]
          }]
        }
      ]
    }
  }),
  csvNodeTour: new Workspace({
    goldenLayoutConfig: {
      content: [
        {
          type: 'row',
          content: [{
            type: 'column',
            content: [{
              type: 'component',
              componentName: 'CsvNodeTourView',
              componentState: {
                currentStep: 0
              }
            }]
          }, {
            type: 'column',
            content: [{
              type: 'component',
              componentName: 'TableView',
              componentState: {}
            }]
          }]
        }
      ]
    }
  })
};

window.onload = () => {
  window.mainView = new MainView(d3.select('body'));
};
window.onresize = () => {
  if (window.mainView) {
    window.mainView.resize();
  }
};
