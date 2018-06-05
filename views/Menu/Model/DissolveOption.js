import { ModalMenuOption, AnimatedIconMixin } from '../Menu.js';

class DissolveOption extends AnimatedIconMixin(ModalMenuOption) {
  get icon () {
    // TODO: Dynamically switch to hyperedge icon
    return 'img/supernode.svg';
  }
  get animatedIcon () {
    // TODO: Dynamically switch to hyperedge icon
    return 'img/dissolveSupernode.gif';
  }
  get label () {
    // TODO: Dynamically change to Hyperedges, apply the (s) dynamically
    return 'Dissolve Supernode(s)...';
  }
  get enabled () {
    // TODO
    return false;
  }
  setup () {
    super.setup();
    this.contentDiv.text('todo');
  }
}
export default DissolveOption;
