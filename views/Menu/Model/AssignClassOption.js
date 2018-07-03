/* globals mure */
import ModalOperationOption from '../Common/ModalOperationOption.js';

class AssignClassOption extends ModalOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.AssignClass, parentMenu, d3el);
    this.icon = 'img/tag.svg';
  }
}
export default AssignClassOption;
