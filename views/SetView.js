import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

class SetView extends ScrollableGoldenLayoutView {
  constructor (container) {
    super(container, SetView.icon, SetView.label);
    // TODO
  }
}
SetView.icon = 'img/venn.svg';
SetView.label = 'Set Manager';
export default SetView;
