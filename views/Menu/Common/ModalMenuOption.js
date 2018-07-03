import CollapsibleMenu from './CollapsibleMenu.js';

class ModalMenuOption extends CollapsibleMenu {
  setup () {
    super.setup();
    this.contentDiv = this.d3el.append('div')
      .classed('menuOptionContent', true);
    this.d3el.append('hr');
  }
  toggle (state) {
    super.toggle(state);
    if (this.expanded && !this.getRootMenu().expanded) {
      this.getRootMenu().toggle(true);
    }
  }
  draw () {
    super.draw();
    this.contentDiv.style('display', this.expanded ? null : 'none');
    this.d3el.selectAll(':scope > hr')
      .style('display', this.expanded ? null : 'none');
  }
}
export default ModalMenuOption;
