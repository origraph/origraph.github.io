import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

class InstanceView extends ScrollableGoldenLayoutView {
  constructor (container) {
    super(container, InstanceView.icon, InstanceView.label);
    // TODO
  }
}
InstanceView.icon = 'img/instanceView.svg';
InstanceView.label = 'Instance Topology';
export default InstanceView;
