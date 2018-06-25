/* globals mure */
import { SortedSubMenu, ConvertMenuOption } from '../Menu.js';

class ConvertMenu extends SortedSubMenu {
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
        Object.keys(window.mainView.availableOperations.conversions).length === 0);
  }
  compare (a, b) {
    if (a.enabled && !b.enabled) {
      // a is enabled and b isn't; it should come first
      return -1;
    } else if (b.enabled && !a.enabled) {
      return 1;
    } else {
      // default: sort alphabetically
      return a.label < b.label ? -1 : 1;
    }
  }
}
export default ConvertMenu;
