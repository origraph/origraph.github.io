/* globals d3 */
import { View } from '../uki.es.js';

class SpiralTest extends View {
  constructor () {
    super();
    this.lineGenerator = d3.line()
      .x(d => d.x)
      .y(d => d.y);
    // .curve(d3.curveCatmullRom.alpha(1));
    this.colorMap = d3.schemeDark2;

    this.parameters = {
      number: { min: 1, max: 200, value: 150, step: 1 },
      branches: { min: 2, max: 10, value: 3, step: 1 },
      nodeRadius: { min: 1, max: 20, value: 10, step: 1 },
      layerSize: { min: 1, max: 50, value: 10, step: 1 }
    };
  }
  setup (d3el) {
    d3el.append('g').attr('id', 'arcs');
    d3el.append('g').attr('id', 'nodes');
    let body = d3el.append('foreignObject')
      .attr('x', 25)
      .attr('y', 25)
      .attr('width', 400)
      .attr('height', 200)
      .append('xhtml:body');
    let controls = body.selectAll('.control').data(d3.entries(this.parameters));
    controls.exit().remove();
    let controlsEnter = controls.enter().append('div').classed('control', true);
    controls = controls.merge(controlsEnter);

    controls.attr('id', d => d.key);

    controlsEnter.append('label').classed('parameter', true);
    controls.select('label').text(d => d.key);
    controlsEnter.append('input');
    let self = this;
    controls.select('input')
      .attr('type', 'range')
      .attr('min', d => d.value.min)
      .attr('max', d => d.value.max)
      .attr('value', d => d.value.value)
      .attr('step', d => d.value.step)
      .on('change', function (d) {
        self.parameters[d.key].value = this.value;
        self.render();
      });
    controlsEnter.append('label').classed('value', true);
  }
  computePoints () {
    let points = [];
    let level = 1;
    let spotsLeft = 1;
    let index = 0;
    for (let i = 1; i <= this.parameters.number.value; i++) {
      if (index >= spotsLeft) {
        index = 0;
        spotsLeft = this.parameters.branches.value ** level;
        level += 1;
      }
      let theta = 2 * Math.PI * index / spotsLeft;
      let x = (level - 1) * this.parameters.layerSize.value * 2 * Math.cos(theta);
      let y = (level - 1) * this.parameters.layerSize.value * 2 * Math.sin(theta);
      index += 1;
      points.push({
        level,
        index,
        x,
        y
      });
    }
    return points;
  }
  draw (d3el) {
    let bounds = d3el.node().getBoundingClientRect();
    let center = {
      x: bounds.width / 2,
      y: bounds.height / 2
    };

    Object.keys(this.parameters).forEach(parameter => {
      d3el.select('#' + parameter)
        .select('.value')
        .text(this.parameters[parameter].value);
    });

    let points = this.computePoints();
    let nodes = d3el.select('#nodes')
      .selectAll('.node').data(points);
    nodes.exit().remove();
    let nodesEnter = nodes.enter().append('circle').classed('node', true);
    nodes = nodes.merge(nodesEnter);

    nodes.attr('r', this.parameters.nodeRadius.value)
      .attr('cx', d => center.x + d.x)
      .attr('cy', d => center.y + d.y)
      .attr('fill', (d, i) => this.colorMap[d.level])
      .on('click', d => { console.log(d); });
  }
}
export default SpiralTest;
