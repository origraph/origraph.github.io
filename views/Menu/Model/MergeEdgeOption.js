import { ActionMenuOption } from '../Menu.js';

class MergeEdgeOption extends ActionMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/mergeEdges.svg';
  }
  get label () {
    // TODO: Add "into" for regular edges; add the (s) dynamically
    return 'Merge Hyperedge(s)';
  }
  get enabled () {
    // TODO
    return false;
  }
  executeAction () {
    // TODO
    console.warn('todo');
  }
}
export default MergeEdgeOption;
