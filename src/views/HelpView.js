import GoldenLayoutView from './GoldenLayoutView.js';

class HelpView extends GoldenLayoutView {
  constructor (container) {
    super(container, HelpView.icon, HelpView.label);
    // TODO
  }
}
HelpView.icon = 'img/help.svg';
HelpView.label = 'Help';
export default HelpView;
