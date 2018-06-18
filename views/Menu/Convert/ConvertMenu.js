/* globals mure */
import { SubMenu, ConvertMenuOption } from '../Menu.js';

class ConvertMenu extends SubMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/convert.svg';
    this.label = 'Convert to...';
    this.items = Object.entries(mure.ITEM_TYPES)
      .filter(([typeName, ItemType]) => {
        // don't include strict superclasses
        return ItemType !== mure.ITEM_TYPES.TaggableItem &&
          ItemType !== mure.ITEM_TYPES.PrimitiveItem;
      }).map(([typeName, ItemType]) => {
        return new ConvertMenuOption(typeName, ItemType, this);
      });
  }
  draw () {
    super.draw();
    this.d3el.select('.button')
      .classed('disabled', !window.mainView.availableOperations ||
        Object.keys(window.mainView.availableOperations.possibleConversions).length === 0);
  }
}
export default ConvertMenu;
