/* globals mure */
import { ContextualOperationOption } from '../Menu.js';

class ConvertOption extends ContextualOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Convert, parentMenu, d3el);
  }
}
export default ConvertOption;
