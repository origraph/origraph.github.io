export default (superclass) => class extends superclass {
  setup () {
    super.setup();
    this.summary.select('.button')
      .on('mouseover', () => {
        this.summary.select('.button > a > img')
          .attr('src', this.animatedIcon);
      })
      .on('mouseout', () => {
        this.summary.select('.button > a > img')
          .attr('src', this.icon);
      });
  }
};
