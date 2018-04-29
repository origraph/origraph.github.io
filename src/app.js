/* globals d3 */

import SchemaView from './views/SchemaView.js';
// import TableView from './views/TableView.js';

let views = {
  // TableView,
  SchemaView
};

class MainApp {
  constructor () {
    let { viewName } = this.parseLocation();
    this.viewName = views[viewName] ? viewName : 'SchemaView';
    this.saveState();
    window.onpopstate = event => {
      this.navigate(event.state || {});
    };
    this.navigate();
  }
  saveState () {
    window.history.pushState({
      viewName: this.viewName
    }, '', this.getUrl());
  }
  parseLocation () {
    let result = {};
    window.location.search.substr(1).split('&').forEach(chunk => {
      let [key, value] = chunk.split('=');
      result[key] = decodeURIComponent(value);
    });
    return result;
  }
  getUrl () {
    let url = window.location.origin + window.location.pathname + '?' +
      'viewName=' + encodeURIComponent(this.viewName);
    return url;
  }
  async navigate ({ viewName = this.viewName } = {}) {
    viewName = views[viewName] ? viewName : this.viewName;
    if (viewName !== this.viewName) {
      this.viewName = viewName;
      this.saveState();
    }
    let body = d3.select('body').attr('class', this.viewName);
    if (!this.view) {
      this.view = new views[this.viewName](body, this.model);
      window.onresize = () => { this.view.render(); };
    } else {
      this.view.render();
    }
  }
}

window.onload = () => {
  window.mainApp = new MainApp();
};
