export default (superclass) => class extends superclass {
  setupContentElement () {
    return this.d3el.append('svg');
  }
  getContentBounds (content) {
    const bounds = content.node().parentNode.getBoundingClientRect();
    content.attr('width', bounds.width)
      .attr('height', bounds.height);
    return bounds;
  }
};
