/* globals mure, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

const NODE_SIZE = 50;
const FLOATING_EDGE_LENGTH = 50;
const MENU_SIZE = 20;

class NetworkModelView extends SvgViewMixin(GoldenLayoutView) {
  constructor({
    container,
    state
  }) {
    super({
      container,
      icon: NetworkModelView.icon,
      label: NetworkModelView.label
    });
  }
  isEmpty() {
    return Object.keys(mure.classes).length === 0;
  }
  setup() {
    super.setup();
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink()) //.id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-NODE_SIZE))
      .force('center', d3.forceCenter())
      .force('collide', d3.forceCollide().radius(NODE_SIZE));

    this.linkLayer = this.content.append('g').classed('linkLayer', true);
    this.nodeLayer = this.content.append('g').classed('nodeLayer', true);

    //set drag behavior
    let dragstarted = (d) => {
      console.log('started drag',d)
    }

    let dragended = (d) => {
      console.log('ended drag')
    }

    const self = this;
    let dragged = function(d){

      console.log('dragging',d)


      d3.select(this)
      .attr('transform', node => {
        node.x = d3.event.x; node.y = d3.event.y;
        return `translate(${d3.event.x},${d3.event.y})`;
      });

      let associatedEdge = d3.selectAll('.edge').filter(dd=>dd.selector === d.selector);

      console.log(associatedEdge.size())
      associatedEdge
        .select('path')
        .attr('d', d => {
          let source = mure.classes[d.sourceSelector] ? mure.classes[d.sourceSelector] : d;
          let target = mure.classes[d.targetSelector] ? mure.classes[d.targetSelector] : d;

          return self.edgePathGenerator(source, target)
        })
    }

    this.drag = d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);


  }
  draw() {
    const bounds = this.getContentBounds(this.content);
    const graph = this.deriveGraph();

    console.log(bounds, graph);

    let nodes = this.nodeLayer.selectAll('.node')
      .data(graph.nodes, d => d.className);
    nodes.exit().remove();
    let nodesEnter = nodes.enter().append('g')
      .classed('node', true);

    nodesEnter.append('circle');
    nodesEnter.append('text');
    nodesEnter.append('image')

    nodes = nodes.merge(nodesEnter);

    nodes.call(this.drag);


    nodes.select('image')
      .attr('xlink:href', '../img/hamburger.svg')
      .attr('height', MENU_SIZE)
      .attr('width', MENU_SIZE)
      .attr('x', d => d.type === 'Node' ? NODE_SIZE - MENU_SIZE : MENU_SIZE)
      .attr('y', d => d.type === 'Node' ? -NODE_SIZE : 0)

    nodes.select('circle').attr('r', d => d.type === 'Node' ? NODE_SIZE : NODE_SIZE / 8);

    nodes.select('text').text(d => d.type === 'Node' ? d.className : '');
    nodes.select('text').style('text-anchor', 'middle')


    let edges = this.nodeLayer.selectAll('.edge')
      .data(graph.nodes.filter(n => n.type === 'Edge'), d => d.className);
    edges.exit().remove();
    let edgeEnter = edges.enter().append('g')
      .classed('edge', true);
    edgeEnter.append('path').attr('id', 'test');
    edgeEnter.append('text').append('textPath')

    edges = edges.merge(edgeEnter);

    // edges.call(this.drag);

    // edges.select('textPath').text(d => d.className);
    edges.select('textPath').attr('href', '#test');

    edges.select('path')
      .attr('stroke-width', '6px')

    let links = this.linkLayer.selectAll('.link')
      .data(graph.links, d => d.className);
    links.exit().remove();
    let linksEnter = links.enter().append('g')
      .classed('link', true);
    links = links.merge(linksEnter);
    linksEnter.append('path');

    const hover = function (d) {
      window.mainView.showTooltip({
        content: 'testing',
        targetBounds: this.getBoundingClientRect()
      });
      d3.select(this).classed('hovered', true);
    };
    const unhover = function () {
      window.mainView.hideTooltip();
      d3.select(this).classed('hovered', false);
    };
    const click = async d => {
      window.mainView.setUserSelection(await this.location.filter({
        className: d.key
      }));
    };
    nodes.on('mouseover', hover);
    links.on('mouseover', hover);
    nodes.on('mouseout', unhover);
    links.on('mouseout', unhover);
    nodes.on('click', () => window.mainView.showTooltip({
      content: 'testing'
    }));
    links.on('click', click);

    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);
    this.simulation.on('tick', () => {
      nodes.attr('transform', node => {
        return `translate(${node.x},${node.y})`;
      });


      edges.select('textPath').attr('side', d => {
        let source = mure.classes[d.sourceSelector] ? mure.classes[d.sourceSelector] : d;
        let target = mure.classes[d.targetSelector] ? mure.classes[d.targetSelector] : d;

        return source.x > target.x ? 'left' : 'right'
      });



      // edges.select('text').attr('x',d=>{
      //   let source = mure.classes[d.sourceSelector] ? mure.classes[d.sourceSelector] : d;
      //   let target = mure.classes[d.targetSelector] ? mure.classes[d.targetSelector] : d;
      //   return ( source.x + target.x )/2;
      // })

      // edges.select('text').attr('y',d=>{
      //   let source = mure.classes[d.sourceSelector] ? mure.classes[d.sourceSelector] : d;
      //   let target = mure.classes[d.targetSelector] ? mure.classes[d.targetSelector] : d;
      //   return ( source.y + target.y )/2;
      // })

      edges
        .select('path')
        .attr('d', d => {
          let source = mure.classes[d.sourceSelector] ? mure.classes[d.sourceSelector] : d;
          let target = mure.classes[d.targetSelector] ? mure.classes[d.targetSelector] : d;

          return this.edgePathGenerator(source, target)
        })
      // links.select('path').attr('d', d => {
      //   let links = d; //graph.linkLookup['link' + d.key];
      //   console.log(d);
      //   return this.computeHyperlinkPath({
      //     link: graph.nodes[graph.nodeLookup['link' + d.key]],
      //     sourceLinks: links.sources.map(i => graph.links[i]),
      //     targetLinks: links.targets.map(i => graph.links[i]),
      //     undirecteds: links.undirecteds.map(i => graph.links[i])
      //   });
      // });
    });
    this.simulation.nodes(graph.nodes);
    this.simulation.force('link')
      .links(graph.links);

  }
  /*
  computeHyperlinkPath ({ link, sourceLinks, targetLinks, undirecteds }) {
    let sourceX = 0;
    let sourceY = 0;
    let targetX = 0;
    let targetY = 0;
    sourceLinks.forEach(d => {
      sourceX += d.target.x - d.source.x;
      sourceY += d.target.y - d.source.y;
    });
    const thetaIn = Math.atan2(sourceY, sourceX);
    targetLinks.forEach(d => {
      targetX += d.target.x - d.source.x;
      targetY += d.target.y - d.source.y;
    });
    const thetaOut = Math.atan2(targetY, targetX);
    const theta = (thetaIn + thetaOut) / 2;
    const anchorOffset = {
      x: NODE_SIZE * Math.cos(theta),
      y: NODE_SIZE * Math.sin(theta)
    };
    let sourceSegments = sourceLinks.map(d => `\
M${d.source.x},${d.source.y}\
Q${d.target.x - anchorOffset.x},${d.target.y - anchorOffset.y},
${d.target.x},${d.target.y}`);
    return sourceSegments + targetLinks.map(d => `\
M${d.source.x},${d.source.y}\
Q${d.source.x + anchorOffset.x},${d.source.y + anchorOffset.y},
${d.target.x},${d.target.y}`);
}
*/

  edgePathGenerator(source, target) {
    //floating edges
    if (source === target) {
      return 'M' + (source.x - FLOATING_EDGE_LENGTH) + ' ' + source.y + 'L' + (target.x + FLOATING_EDGE_LENGTH) + ' ' + target.y + 'Z';
    }
    //edge has at least one "anchor"
    return 'M' + source.x + ' ' + source.y + 'L' + target.x + ' ' + target.y + 'Z';
  }
  deriveGraph() {
    const edgeClasses = [];
    const nodeLookup = {}; // maps a class selector to an index in graph.nodes
    let graph = {
      nodes: [],
      links: []
    };

    // Create nodes + pseudo-nodes
    Object.entries(mure.classes).forEach(([selector, classObj]) => {
      nodeLookup[classObj.selector] = graph.nodes.length;
      graph.nodes.push(classObj);
      if (classObj.type === 'Edge') {
        edgeClasses.push(classObj);
      }
    });

    // Get any links that exist
    edgeClasses.forEach(edgeClass => {
      if (edgeClass.sourceSelector !== null) {
        graph.links.push({
          source: nodeLookup[edgeClass.sourceSelector],
          target: nodeLookup[edgeClass.selector],
          directed: edgeClass.directed
        });
      }
      if (edgeClass.targetSelector !== null) {
        graph.links.push({
          source: nodeLookup[edgeClass.selector],
          target: nodeLookup[edgeClass.targetSelector],
          directed: edgeClass.directed
        });
      }
    });

    return graph;
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;