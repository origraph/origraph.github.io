import ActionMenuOption from './Common/ActionMenuOption.js';

class HelpButton extends ActionMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/help.svg';
    this.label = 'About Origraph';
  }
  async executeAction () {
    window.mainView.showIntro();
  }
}
export default HelpButton;
