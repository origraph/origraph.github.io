import BaseMenu from './BaseMenu.js';

class CheckableMenuOption extends BaseMenu {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['isChecked', 'toggle']);
  }
  setup () {
    super.setup();
    this.summary.append('img')
      .classed('checkmark', true)
      .attr('src', 'img/check.svg');
    this.summary.on('click', () => {
      this.toggle();
    });
  }
  draw () {
    super.draw();
    (async () => {
      let checked = await this.isChecked();
      this.summary.select('.button')
        .classed('selected', checked);
      this.summary.select('.checkmark')
        .style('display', checked && this.getRootMenu().expanded ? null : 'none');
    })();
  }
}
export default CheckableMenuOption;
