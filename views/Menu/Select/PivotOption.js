/* globals mure */
import ModalOperationOption from '../Common/ModalOperationOption.js';

class NavigateOption extends ModalOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Navigate, parentMenu, d3el);
  }
}
export default NavigateOption;
