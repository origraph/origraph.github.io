/* globals mure */
import ModalOperationOption from '../Common/ModalOperationOption.js';

class AttachOption extends ModalOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Attach, parentMenu, d3el);
  }
}
export default AttachOption;
