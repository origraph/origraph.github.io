/* globals d3 */
import SvgViewMixin from './SvgViewMixin.js';
export default (superclass) => class extends SvgViewMixin(superclass) {
  setupContentElement () {
    const content = super.setupContentElement();
    content.call(d3.zoom()
      .scaleExtent([1 / 4, 4])
      .on('zoom', () => { this.zoom(); }));
    return content;
  }
  zoom () {
    this.content.selectAll(':scope > g')
      .attr('transform', d3.event.transform);
  }
};
