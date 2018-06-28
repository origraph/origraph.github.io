import GoldenLayoutView from './GoldenLayoutView.js';

class NetworkModelView extends GoldenLayoutView {
  constructor (container) {
    super({
      container,
      icon: NetworkModelView.icon,
      label: NetworkModelView.label
    });
    // TODO
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;
