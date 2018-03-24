/* globals d3, mure */

import TwoLayerModel from './models/TwoLayerModel.js';
import TableView from './views/TableView/TableView.js';

let views = {
  TableView
};

class MainApp {
  constructor () {
    let { viewName, selection } = this.parseLocation();
    this.viewName = views[viewName] ? viewName : 'TableView';
    this.selection = selection || null;
    this.saveState();
    window.onpopstate = event => {
      this.navigate(event.state);
    };
    this.navigate();
  }
  saveState () {
    window.history.pushState({
      viewName: this.viewName,
      selection: this.selection
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
    if (this.selection) {
      url += '&' + 'selection=' + encodeURIComponent(this.selection);
    }
    return url;
  }
  async navigate ({ viewName = this.viewName, selection = this.selection } = {}) {
    viewName = views[viewName] ? viewName : this.viewName;
    if (selection !== this.selection || viewName !== this.viewName) {
      this.selection = selection;
      this.viewName = viewName;
      this.saveState();
    }
    // We use a null selection to store state, but to actually get the
    // root selection, we have to revert it back to undefined
    let selectionObj = mure.selectAll(this.selection || undefined);
    let body = d3.select('body').attr('class', this.viewName);
    if (!this.model || !this.view) {
      this.model = new TwoLayerModel(selectionObj);
      this.view = new views[this.viewName](body, this.model);
      window.onresize = () => { this.view.render(); };
    } else {
      this.view.render(); // show the spinner
      await this.model.update(selectionObj);
    }
    this.view.render();
  }
}

window.onload = () => {
  window.mainApp = new MainApp();
};
