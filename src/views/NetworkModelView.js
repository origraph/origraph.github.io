import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

class NetworkModelView extends ScrollableGoldenLayoutView {
  constructor (container) {
    super(container, NetworkModelView.icon, NetworkModelView.label);
    // TODO
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;
