/* globals mure */
import { ContextualOperationOption } from '../Menu.js';

class PivotOption extends ContextualOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Pivot, parentMenu, d3el);
  }
}
export default PivotOption;
