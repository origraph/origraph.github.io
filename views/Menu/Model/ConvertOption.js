/* globals mure */
import ContextualOperationOption from '../Common/ContextualOperationOption.js';

class ConvertOption extends ContextualOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Convert, parentMenu, d3el);
  }
}
export default ConvertOption;
