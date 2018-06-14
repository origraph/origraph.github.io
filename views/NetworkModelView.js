import { ScrollableGoldenLayoutView, EmptyStateMixin } from './GoldenLayoutView.js';

class NetworkModelView extends EmptyStateMixin(ScrollableGoldenLayoutView) {
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
