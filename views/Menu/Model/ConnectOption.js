/* globals mure */
import ModalOperationOption from '../Common/ModalOperationOption.js';

class ConnectOption extends ModalOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Connect, parentMenu, d3el);
  }
}
export default ConnectOption;
