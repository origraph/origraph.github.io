import { ScrollableGoldenLayoutView, EmptyStateMixin } from './GoldenLayoutView.js';

class SetView extends EmptyStateMixin(ScrollableGoldenLayoutView) {
  constructor (container) {
    super({
      container,
      icon: SetView.icon,
      label: SetView.label
    });
    // TODO
  }
}
SetView.icon = 'img/venn.svg';
SetView.label = 'Set Manager';
export default SetView;
