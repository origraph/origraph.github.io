export default (superclass) => class extends superclass {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.requireProperties(['isEnabled']);
  }
  draw () {
    super.draw();
    (async () => {
      this.summary.select('.button')
        .classed('disabled', !(await this.isEnabled()));
    })();
  }
};
