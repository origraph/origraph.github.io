import { ScrollableGoldenLayoutView, EmptyStateMixin } from './GoldenLayoutView.js';

class InstanceView extends EmptyStateMixin(ScrollableGoldenLayoutView) {
  constructor (container) {
    super({
      container,
      icon: InstanceView.icon,
      label: InstanceView.label
    });
    // TODO
  }
}
InstanceView.icon = 'img/instanceView.svg';
InstanceView.label = 'Instance Topology';
export default InstanceView;
