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
      verticalSpacing: { min: 1, max: 100, value: 20, step: 1 },
      horizontalSpacing: { min: 1, max: 100, value: 20, step: 1 },
      nodeRadius: { min: 1, max: 20, value: 10, step: 1 },
      cycles: { min: 1, max: 10, value: 5, step: 1 }
    };
  }
  setup (d3el) {
    d3el.append('path').attr('id', 'backbone');
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
  computeBackbone () {
    let b = this.parameters.verticalSpacing.value / 2 / Math.PI;
    let thetamax = this.parameters.cycles.value * 2 * Math.PI;
    let backbone = [];
    for (let theta = 0; theta < thetamax; theta += 0.25) {
      backbone.push({
        x: b * theta * Math.cos(theta),
        y: b * theta * Math.sin(theta)
      });
    }
    return backbone;
  }
  computePoints () {
    let b = this.parameters.verticalSpacing.value / 2 / Math.PI;
    let thetamax = this.parameters.cycles.value * 2 * Math.PI;
    let smax = 0.5 * b * thetamax * thetamax;
    let points = [];
    for (let i = 1; i * this.parameters.horizontalSpacing.value <= smax; i += 1) {
      let theta = Math.sqrt(2 * i * this.parameters.horizontalSpacing.value / b);
      let thetaNorm = Math.atan2(Math.sin(theta), Math.cos(theta)) + Math.PI;
      let segment = Math.floor(thetaNorm * 8 / (2 * Math.PI));
      let parent = null; // TODO: figure out way to determine parent
      let root = parent === null ? i : points[parent].root;
      let point = {
        x: b * theta * Math.cos(theta),
        y: b * theta * Math.sin(theta),
        parent,
        root,
        segment
      };
      points.push(point);
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

    d3el.select('#backbone')
      .attr('d', this.lineGenerator(this.computeBackbone().map(p => {
        return {
          x: center.x + p.x,
          y: center.y + p.y
        };
      })));
    let points = this.computePoints();
    let nodes = d3el.select('#nodes')
      .selectAll('.node').data(points);
    nodes.exit().remove();
    let nodesEnter = nodes.enter().append('circle').classed('node', true);
    nodes = nodes.merge(nodesEnter);

    nodes.attr('r', this.parameters.nodeRadius.value)
      .attr('cx', d => center.x + d.x)
      .attr('cy', d => center.y + d.y)
      .attr('fill', (d, i) => this.colorMap[d.segment])
      .on('click', d => { console.log(d); });
  }
}
export default SpiralTest;
