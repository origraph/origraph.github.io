/* globals d3 */
import SvgViewMixin from './SvgViewMixin.js';
export default (superclass) => class extends SvgViewMixin(superclass) {
  setupContentElement () {
    const content = super.setupContentElement();
    this.currentZoom = d3.zoomTransform(content.node());
    content.call(d3.zoom()
      .scaleExtent([1 / 4, 4])
      .on('zoom', () => {
        this.currentZoom = d3.event.transform;
        content.selectAll(':scope > g')
          .attr('transform', this.currentZoom);
      }));
    return content;
  }
};
