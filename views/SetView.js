import GoldenLayoutView from './GoldenLayoutView.js';

class SetView extends GoldenLayoutView {
  constructor (container) {
    super({
      container,
      icon: SetView.icon,
      label: SetView.label
    });
    // TODO
  }
}
SetView.icon = 'img/set.svg';
SetView.label = 'Set Manager';
export default SetView;
