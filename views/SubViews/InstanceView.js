import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

class InstanceView extends SvgViewMixin(GoldenLayoutView) {
  constructor ({ container, state }) {
    super({
      container,
      icon: InstanceView.icon,
      label: InstanceView.label,
      state
    });
  }
  isEmpty () {
    // TODO
    return true;
  }
  // TODO: implement draw() and maybe setup()
}
InstanceView.icon = 'img/instanceView.svg';
InstanceView.label = 'Topology Sample';
export default InstanceView;
