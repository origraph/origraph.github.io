/* globals mure */
import { ContextualOperationOption } from '../Menu.js';

class ConnectOption extends ContextualOperationOption {
  constructor (parentMenu, d3el) {
    super(mure.OPERATIONS.Connect, parentMenu, d3el);
  }
}
export default ConnectOption;
