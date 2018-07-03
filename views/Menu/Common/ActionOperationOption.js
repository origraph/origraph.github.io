import ActionMenuOption from './ActionMenuOption.js';
import OperationMixin from './OperationMixin.js';

class ActionOperationOption extends OperationMixin(ActionMenuOption) {
  async executeAction () {
    if (window.mainView.userSelection) {
      const newSelection = await window.mainView.userSelection.execute(this.operation);
      window.mainView.setUserSelection(newSelection);
    }
  }
}
export default ActionOperationOption;
