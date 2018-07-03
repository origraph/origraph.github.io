/* globals mure */
import ModalOperationOption from '../Common/ModalOperationOption.js';

class ConvertOption extends ModalOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Convert, parentMenu, d3el);
  }
}
export default ConvertOption;
