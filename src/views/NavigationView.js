import GoldenLayoutView from './GoldenLayoutView.js';

class NavigationView extends GoldenLayoutView {
  constructor (container) {
    super(container, NavigationView.icon, NavigationView.label);
    // TODO
  }
}
NavigationView.icon = 'img/navigation.svg';
NavigationView.label = 'Navigation';
export default NavigationView;
