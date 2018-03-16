/* globals d3, mure */

import NodeLinkDD from './views/NodeLinkDD.js';
import SpiralTest from './views/SpiralTest.js';

let views = {
  'NodeLinkDD': NodeLinkDD,
  'SpiralTest': SpiralTest
};

console.log('d3 version:', d3.version);
console.log('mure version:', mure.version);

function resize () {
  d3.select('svg')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight);
}

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
  let selection;
  if (location.selection) {
    selection = mure.selectAll(location.selection);
  } else {
    // TODO
    selection = mure.selectAll('@ { "_id": "application/json;blackJack_round2.json" }');
    // selection = mure.selectAllDocs();
  }
  if (!window.currentView) {
    let viewName = views[location.view] ? location.view : 'NodeLinkDD';
    d3.select('svg').attr('class', viewName);
    window.currentView = new views[viewName](selection);
  }
  window.currentView.render(d3.select('svg'));
}

window.onload = () => { resize(); navigate(); };
window.onresize = resize;
