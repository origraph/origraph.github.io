import { View } from '../lib/uki.esm.js';

class SubView extends View {
  constructor (d3el, savedState, mainView) {
    super(d3el);
    // TODO: GoldenLayout stores view-specific savedState via localStorage...
    // keeping the placeholder here, but not using it yet
    this.mainView = mainView;
  }
  setup () {
    this.d3el.text('TODO: view not implemented');
  }
}
export default SubView;
