/* globals mure */
import ModalOperationOption from '../Common/ModalOperationOption.js';

class PivotOption extends ModalOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Pivot, parentMenu, d3el);
  }
}
export default PivotOption;
