/* globals d3, mure */

import TwoLayerModel from './models/TwoLayerModel.js';
import TableView from './views/TableView/TableView.js';

let views = {
  TableView
};

function getLocation () {
  let result = {};
  window.location.search.substr(1).split('&').forEach(chunk => {
    let [key, value] = chunk.split('=');
    result[key] = decodeURIComponent(value);
  });
  return result;
}

async function navigate () {
  let location = getLocation();
  window.model = new TwoLayerModel(mure.selectAll(location.selection));
  let body = d3.select('body');
  let viewName = views[location.view] ? location.view : 'TableView';
  if (!window.view || !(window.view instanceof views[viewName])) {
    window.view = new views[viewName](body, window.model);
  } else {
    window.view.setModel(window.model);
  }
  body.attr('class', viewName);
  window.view.render();
  window.onresize = () => { window.view.render(); };
}

window.onload = navigate;
