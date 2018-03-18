/* globals d3 */
import { View } from '../uki.es.js';

class StaggeredTest extends View {
  constructor () {
    super();
    this.lineGenerator = d3.line()
      .x(d => d.x)
      .y(d => d.y);
    // .curve(d3.curveCatmullRom.alpha(1));
    this.colorMap = d3.schemeDark2;

    this.parameters = {
      number: { min: 1, max: 200, value: 50, step: 1 },
      nodeRadius: { min: 1, max: 20, value: 5, step: 1 },
      spacing: { min: 1, max: 30, value: 15, step: 1 },
      layers: { min: 1, max: 10, value: 5, step: 1 },
      angle: { min: 0.2, max: 2, value: 1.5, step: 0.1 }
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
        self.parameters[d.key].value = Number(this.value);
        self.render();
      });
    controlsEnter.append('label').classed('value', true);
  }
  computePoints () {
    let points = [];
    let dTheta = this.parameters.angle.value * Math.PI / (this.parameters.number.value + 1);
    for (let i = 1; i <= this.parameters.number.value; i++) {
      let layer = i % this.parameters.layers.value;
      points.push({
        layer,
        theta: dTheta * i
      });
    }
    let r2 = (this.parameters.layers.value + 1) * this.parameters.spacing.value;
    points.forEach(p => {
      p.r = (this.parameters.layers.value - p.layer) * this.parameters.spacing.value;
      p.x = p.r * Math.cos(p.theta);
      p.y = p.r * Math.sin(p.theta);
      p.x2 = r2 * Math.cos(p.theta);
      p.y2 = r2 * Math.sin(p.theta);
    });
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
      .attr('fill', (d, i) => this.colorMap[d.layer])
      .on('click', d => { console.log(d); });

    let arcs = d3el.select('#arcs')
      .selectAll('.arc').data(points);
    arcs.exit().remove();
    let arcsEnter = arcs.enter().append('line').classed('arc', true);
    arcs = arcs.merge(arcsEnter);

    arcs
      .attr('x1', d => center.x + d.x)
      .attr('y1', d => center.y + d.y)
      .attr('x2', d => center.x + d.x2)
      .attr('y2', d => center.y + d.y2);
  }
}
export default StaggeredTest;
