/* globals mure */
import ContextualOperationOption from '../Common/ContextualOperationOption.js';

class ConnectOption extends ContextualOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Connect, parentMenu, d3el);
  }
}
export default ConnectOption;
