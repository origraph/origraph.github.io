import GoldenLayoutView from './GoldenLayoutView.js';

class InstanceView extends GoldenLayoutView {
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
