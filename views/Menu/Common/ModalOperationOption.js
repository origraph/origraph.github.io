import OperationOptionsRenderer from '../../Common/OperationOptionsRenderer.js';
import ModalMenuOption from './ModalMenuOption.js';
import DisableableOptionMixin from './DisableableOptionMixin.js';

class ModalOperationOption extends DisableableOptionMixin(ModalMenuOption) {
  constructor (operation, parentMenu, d3el) {
    super(parentMenu, d3el);
    this.operation = operation;
    this.icon = `img/${operation.lowerCamelCaseType}.svg`;
    this.label = operation.humanReadableType;
    this.optionsRenderer = new OperationOptionsRenderer(null, this.operation);
    window.mainView.on('selectionUpdated', () => {
      this.optionsRenderer.updateChoices();
    });
  }
  setup () {
    super.setup();
    this.optionsRenderer.render(this.contentDiv);
  }
  draw () {
    super.draw();
    this.optionsRenderer.render();
  }
  async isEnabled () {
    return window.mainView.userSelection &&
      this.operation.potentiallyExecutableOnSelection(window.mainView.userSelection);
  }
}
export default ModalOperationOption;
