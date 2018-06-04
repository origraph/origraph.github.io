import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

class HelpView extends ScrollableGoldenLayoutView {
  constructor (container) {
    super(container, HelpView.icon, HelpView.label);
    // TODO
  }
}
HelpView.icon = 'img/help.svg';
HelpView.label = 'Help';
export default HelpView;
