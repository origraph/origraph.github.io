import ModalOperationOption from '../Common/ModalOperationOption.js';

class SelectMenu extends ModalOperationOption {
  constructor (parentMenu, d3el) {
    super(window.mure.OPERATIONS.SelectAll, parentMenu, d3el);
    this.icon = 'img/select.svg';
    this.label = 'Select';
  }
}
export default SelectMenu;
