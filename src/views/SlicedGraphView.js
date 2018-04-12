import GraphView from './GraphView.js';

class SlicedGraphView extends GraphView {
  async update (linkedViewSpec) {
    this.slices = null;
    await super.update(linkedViewSpec);
    this.render(); // 'Slicing...' spinner
    this.slices = await this.computeSlices();
  }
  async computeSlices () {
    throw new Error('unimplemented');
  }
  async draw (d3el) {
    await super.draw(d3el);
    if (!this.slices) {
      this.showOverlay(d3el, {
        message: 'Slicing...',
        spinner: true
      });
    }
  }
}
export default SlicedGraphView;
