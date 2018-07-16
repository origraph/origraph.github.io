import OperationOptionsRenderer from '../../Common/OperationOptionsRenderer.js';
import ModalMenuOption from './ModalMenuOption.js';
import OperationMixin from './OperationMixin.js';

class ModalOperationOption extends OperationMixin(ModalMenuOption) {
  draw () {
    super.draw();
    (async () => {
      if (this.expanded && window.mainView.userSelection) {
        let optionRenderer = new OperationOptionsRenderer(
          this.optionsDiv, this.operation, window.mainView.userSelection);
        optionRenderer.drawOptions();
        this.applyButton.classed('disabled', !(await optionRenderer.ready()))
          .on('click', async () => {
            if (await optionRenderer.ready()) {
              const inputOptions = await optionRenderer.getInputOptions();
              const newSelection = await window.mainView.userSelection
                .execute(this.operation, inputOptions);
              window.mainView.setUserSelection(newSelection);
            }
          });
      }
    })();
  }
}
export default ModalOperationOption;
