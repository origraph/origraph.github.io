/* globals d3, origraph */
import SubMenu from './Common/SubMenu.js';
import CollapsibleMenu from './Common/CollapsibleMenu.js';

import ModelMenu from './ModelMenu/ModelMenu.js';
import ExampleModelMenu from './ExampleModelMenu/ExampleModelMenu.js';
import NewModelMenu from './NewModelMenu.js';
import HelpButton from './HelpButton.js';

class MainMenu extends SubMenu {
  constructor (d3el) {
    super(null, d3el);
    this.icon = 'img/hamburger.svg';
    this.label = 'Menu';
    this._modelMenus = {};
    for (const modelId of Object.keys(origraph.models)) {
      this._modelMenus[modelId] = new ModelMenu(this, null, modelId);
    }
    this._exampleModelMenu = new ExampleModelMenu(this);
    this._newModelMenu = new NewModelMenu(this);
    this._helpButton = new HelpButton(this);
  }
  get items () {
    const nextModelMenus = {};
    for (const modelId of Object.keys(origraph.models)) {
      nextModelMenus[modelId] = this._modelMenus[modelId] ||
        new ModelMenu(this, null, modelId);
    }
    this._modelMenus = nextModelMenus;
    return [
      this._exampleModelMenu,
      this._newModelMenu
    ].concat(Object.values(this._modelMenus)).concat([
      this._helpButton
    ]);
  }
  setup () {
    super.setup();
    // Don't show a separator for the root menu
    this.d3el.select(':scope > hr').remove();
  }
  draw () {
    CollapsibleMenu.prototype.draw.call(this);
    const wasSquished = d3.select('#contents').classed('squished');
    d3.select('#contents').classed('squished', this.expanded);
    d3.select('#menu').classed('expanded', this.expanded);
    if (wasSquished !== this.expanded) {
      window.mainView.resize();
    }
    this.drawItems();
  }
}
export default MainMenu;
