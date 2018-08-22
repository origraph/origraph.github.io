import BaseMenu from './BaseMenu.js';

class ActionMenuOption extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['executeAction']);
  }
  setup () {
    super.setup();
    this.summary.on('click', () => {
      this.executeAction();
    });
  }
}
export default ActionMenuOption;
