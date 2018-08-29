/* globals mure, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

const NODE_SIZE = 50;
const FLOATING_EDGE_LENGTH = 50;
const EDGE_STUB_LENGTH = 25;
// const MENU_SIZE = 20; // was used for the menu which may not need an icon anymore and is simply invoked on click. 
let TICK_COUNT = 0;

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

    this.content.on('click', () => window.mainView.hideTooltip())
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink()) //.distance(50)) //.id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-NODE_SIZE))
      .force('center', d3.forceCenter())
      .force('collide', d3.forceCollide().radius(NODE_SIZE));

    this.lineGenerator = d3.line()
      .curve(d3.curveBasis);

    //flag to monitor if user is dragging (supress mouseover callbacks)
    this.dragging = false;
    //flag to monitor mouseover to render self/edges
    this.sourceMousedOver = false;
    this.sourceDrag;

    //flag to monitor mouseover to connect edges
    this.targetDrag = 'default';

    this.simulation.on('tick', () => {

      TICK_COUNT = TICK_COUNT + 1;
      if (TICK_COUNT > 5) {
        this.simulation.stop();
      }

      //ensure the network model stays within the bounds of the visible area of this view.
      const bounds = this.getContentBounds(this.content);

      d3.selectAll('.object').attr('transform', node => {
        node.x = Math.max(NODE_SIZE, Math.min(bounds.width - NODE_SIZE, node.x));
        node.y = Math.max(NODE_SIZE, Math.min(bounds.height - NODE_SIZE, node.y));
        return `translate(${node.x},${node.y})`;
      });

      d3.selectAll('.edge').select('path')
        .attr('d', d => {
          let source = mure.classes[d.sourceClassId] ? mure.classes[d.sourceClassId] : d;
          let target = mure.classes[d.targetClassId] ? mure.classes[d.targetClassId] : d;

          return self.edgePathGenerator(source, target)
        })


      d3.selectAll('.edge').select('.sourceHandle').attr('cx', d => {
          let source = mure.classes[d.sourceClassId] ? mure.classes[d.sourceClassId] : d;
          return source === d ? -FLOATING_EDGE_LENGTH : 0;
        })
        .attr('cy', 0)


      d3.selectAll('.edge').select('.targetHandle').attr('cx', d => {
          let target = mure.classes[d.targetClassId] ? mure.classes[d.targetClassId] : d;
          return target === d ? +FLOATING_EDGE_LENGTH : 0;
        })
        .attr('cy', 0)


      // d3.selectAll('.edge').select('image').attr('transform', node => {
      //   return `translate(${node.x},${node.y})`;
      // });

    });

    //create markers for edge endpoints
    let markers = [{
      id: 0,
      name: 'circle',
      path: 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0',
      viewbox: '-6 -6 12 12'
    }, {
      id: 1,
      name: 'square',
      path: 'M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z',
      viewbox: '-5 -5 10 10'
    }, {
      id: 2,
      name: 'arrow',
      path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z',
      viewbox: '-5 -5 10 10'
    }, {
      id: 2,
      name: 'stub',
      path: 'M 0,0 m -1,-5 L 1,-5 L 1,5 L -1,5 Z',
      viewbox: '-1 -5 2 10'
    }]

    let defs = this.content.append('svg:defs');
    defs.selectAll('marker')
      .data(markers)
      .enter()
      .append('svg:marker')
      .attr('id', function (d) {
        return 'marker_' + d.name
      })
      .attr('markerHeight', 2)
      .attr('markerWidth', 2)
      .attr('markerUnits', 'strokeWidth')
      .attr('orient', 'auto')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('viewBox', function (d) {
        return d.viewbox
      })
      .append('svg:path')
      .attr('d', function (d) {
        return d.path
      })


    this.linkLayer = this.content.append('g').classed('linkLayer', true);
    this.nodeLayer = this.content.append('g').classed('nodeLayer', true);

    //set drag behavior
    let dragstarted = (d) => {
      //Keep track of dragging to inhibit mouseover events
      this.dragging = true;
      this.sourceDrag = d;

      if (typeof d !== 'string') {
        d.fx = d.fy = null;
      }
    }

    const self = this;

    let dragended = async function (d) {
      //Keep track of dragging to inhibit mouseover events
      self.dragging = false;

      let dragObject = d3.select(this).attr('class');

      //reset edge stub to it's original position
      if (dragObject.includes('anchor')) {
        d3.select(this)
          .attr('d', self.lineGenerator(
            [
              [0, 0],
              [NODE_SIZE + EDGE_STUB_LENGTH, 0]
            ]
          ))
      }

      //Dragged a node
      d.fx = d.x;
      d.fy = d.y;

      console.log(self.targetDrag, d)

      if (self.targetDrag && self.targetDrag !== d) {

        let targetNode = self.targetDrag

        let sourceAttr = await (window.mainView.getAttributes(d.classId))
        let targetAttr = await (window.mainView.getAttributes(targetNode.classId))

        let content = '<div class="vertical-menu"> <a href="#" class=active>' + d.className + '</a>'

        sourceAttr.map(a => content = content + '<a href="#" attr=' + d.classId + '>' + a + '</a>')
        content = content + '</div>'

        content = content + '<div class="vertical-menu"> <a href="#" class=active>' + targetNode.className + '</a>'

        targetAttr.map(a => content = content + '<a href="#" attr=' + targetNode.classId + '>' + a + '</a>')
        content = content + '</div>'

        content = content + '<div class="menu-submit"> <a href="#" class=active>Connect</a></div>'

        window.mainView.showTooltip({
          content,
          targetBounds: this.getBoundingClientRect()
        })

        //set listeners for each menu
        d3.select('#tooltip').selectAll('a').on('click', function (d) {
          d3.select(this).classed('selected', !d3.select(this).classed('selected'))
          // console.log('clicked on ', d3.select(this).classed('selected', true)) //attr('attr'), d3.select(this).text())
        })
      }

    }

    let dragged = function (d) {

      let mouse = d3.mouse(d3.select(this.parentNode).node());

      let dragObject = d3.select(this).attr('class');

      if (dragObject === 'targetHandle' || dragObject === 'sourceHandle') {

        d3.select(this)
        .attr('cx', mouse[0])
        .attr('cy', mouse[1]);

        d3.select(this.parentNode).select('.nodeObject').attr('d', () => {
          let handle = dragObject === 'targetHandle' ? d3.select(this.parentNode).select('.sourceHandle') : d3.select(this.parentNode).select('.targetHandle');
          let coords = dragObject === 'targetHandle' ? [[handle.attr('cx'),handle.attr('cy')],mouse] : [mouse,[handle.attr('cx'),handle.attr('cy')]]
          return self.lineGenerator(coords);
        })

      } else if (dragObject.includes('anchor')) {

        //check to see if user is dragging over the source node:
        if (self.sourceMousedOver) {
          //create preview of self edge;
          d3.select(this)
            .attr('d', self.lineGenerator(
              [
                [NODE_SIZE * .9, -NODE_SIZE / 2],
                [NODE_SIZE * 1.5, -NODE_SIZE / 3],
                [NODE_SIZE * 1.5, NODE_SIZE / 3],
                [NODE_SIZE, NODE_SIZE / 2]
              ]
            ))
        } else {
          //have the edge be a straight line to the mouse pointer
          d3.select(this)
            .attr('d', self.lineGenerator(
              [
                [0, 0], mouse
              ]
            ))
        }

      } else {
        d3.select(this)
          .attr('transform', node => {
            node.x = d3.event.x;
            node.y = d3.event.y;
            return `translate(${d3.event.x},${d3.event.y})`;
          });
      }
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

    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);


    this.simulation.nodes(graph.nodes);
    this.simulation.force('link')
      .links(graph.links);

    // //Fix the position of all nodes
    this.simulation.on('end', () => {
      console.log('done')
      // graph.nodes.map(n=>{n.fx = n.x; n.fy = n.y;})
    })

    let nodes = this.nodeLayer.selectAll('.object')
      .data(graph.nodes, d => d.classId);
    nodes.exit().remove();

    let nodesEnter = nodes.enter().append('g')
      .classed('object', true);

    nodesEnter.filter(n => n.type !== 'Edge').append('path')
      .attr('class', 'anchorMouseCatcher')

    nodesEnter.filter(n => n.type !== 'Edge').append('path')
      .attr('class', 'anchor')
      .style('stroke-dasharray', '3px 2px');

    nodesEnter.append('path').attr('class', 'nodeObject').attr('id', d => d.classId); //diamond, circle, or line
    nodesEnter.append('text').append('textPath'); //class Name
    // nodesEnter.append('image') //contextMenu icon

    //for edges, append two endpoints to the edge line
    nodesEnter.filter(n => n.type === 'Edge').append('circle')
      .attr('class', 'sourceHandle')

    nodesEnter.filter(n => n.type === 'Edge').append('circle')
      .attr('class', 'targetHandle')

    nodes = nodes.merge(nodesEnter);

    let edgeNodes = nodes.filter(n => n.type === 'Edge');
    let nonEdgeNodes = nodes.filter(n => n.type !== 'Edge');

    nodes.select('.anchor')
      .attr('opacity', 0)
      .attr('marker-end', 'url(#marker_arrow)')


    nodes.selectAll('.sourceHandle,.targetHandle')
      .attr('r',10)

    d3.selectAll('.anchor')
      .attr('d', this.lineGenerator(
        [
          [0, 0],
          [NODE_SIZE + EDGE_STUB_LENGTH, 0]
        ]
      ))

    d3.selectAll('.anchorMouseCatcher')
      .attr('d', this.lineGenerator(
        [
          [0, 0],
          [NODE_SIZE + EDGE_STUB_LENGTH, 0]
        ]
      ))

    nodes  //.filter(d => d.type !== 'Edge')
    .call(this.drag);

    edgeNodes.attr('marker-end', 'url(#marker_circle)')


    nodes.selectAll('circle').call(this.drag);
    nodes.attr('class', d => d.type.toLowerCase())
    nodes.classed('object', true)

    d3.selectAll('.anchor').call(this.drag)

    //Draw actual node/edges
    nodes.select('.nodeObject').attr('d', d => {
      let xr = d.type === 'Node' || d.type === 'Generic' ? Math.round(NODE_SIZE * 2 / 3) : Math.round(NODE_SIZE * 2 / 3 / 8);
      let yr = d.type === 'Node' || d.type === 'Generic' ? NODE_SIZE : Math.round(NODE_SIZE / 8);


      let diamondPath = 'M0 ' + -yr + ' l ' + xr + ' ' + yr + ' l' + -xr + ' ' + (yr) + ' ' + 'l' + -xr + ' ' + -yr + 'Z';
      let circlePath = 'M0,0' + 'm' + -NODE_SIZE + ',0' + 'a' + NODE_SIZE + ',' + NODE_SIZE + ' 0 1,0 ' + (2 * NODE_SIZE) + ',0' + 'a' + NODE_SIZE + ',' + NODE_SIZE + ' 0 1,0 ' + -(2 * NODE_SIZE) + ',0Z';

      switch (d.type) {
        case "Node":
          return circlePath
        case "Edge":
          let source = mure.classes[d.sourceClassId] ? mure.classes[d.sourceClassId] : d;
          let target = mure.classes[d.targetClassId] ? mure.classes[d.targetClassId] : d;
          return this.edgePathGenerator(source, target)
        case "Generic":
          return diamondPath
      }
    })

    edgeNodes.select('textPath').text(d => d.className) //d => d.className);
    edgeNodes.select('textPath').attr('href', d => '#' + d.classId);
    edgeNodes.select('textPath').attr('startOffset', '10');

    nonEdgeNodes.select('text').text(d => d.className) //type === 'Node' ? 'nodeClass' : ''); //(d => d.type === 'Node' ? d.className : '');
    nonEdgeNodes.select('text').style('text-anchor', 'middle')


    self = this;
    const hover = function (d) {
      if (self.dragging) {
        return;
      }
      d3.selectAll('.anchor,.anchorMouseCatcher')
        .attr('opacity', 0);

      d3.select(this).selectAll('.anchor,.anchorMouseCatcher')
        .attr('opacity', 1);

      // window.mainView.showTooltip({
      //   content: 'testing',
      //   targetBounds: this.getBoundingClientRect()
      // });
      d3.select(this).classed('hovered', true);
    };
    const unhover = function () {
      if (self.dragging) {
        return;
      }

      d3.select(this).selectAll('.anchor,.anchorMouseCatcher')
        .attr('opacity', 0);
      // window.mainView.hideTooltip();
      d3.select(this).classed('hovered', false);
    };
    const click = async d => {
      window.mainView.setUserSelection(await this.location.filter({
        className: d.key
      }));
    };
    nodes.on('mouseenter', hover);

    nodes.select('.nodeObject').on('mouseover', (d) => {
      console.log('entering ', d.className)
      this.targetDrag = d;
      return this.sourceMousedOver = this.sourceDrag && d.classId === this.sourceDrag.classId;
    })

    nodes.select('.nodeObject').on('mouseout', (d) => {
      console.log('leaving ', d.className)
      this.targetDrag = d.className;
      this.sourceMousedOver = false
    })

    nodes.on('mouseleave', unhover);
    nodes.on('click', async function (d) {
      d3.event.stopPropagation();

      window.mainView.showTooltip({
        content: '<div class="vertical-menu">' +
          '<a href="#" action=convert2Node>Interpret as Node</a>' +
          '<a href="#" action =convert2Edge>Interpret as Edge</a>' +
          '<a href="#" action =delete>Delete</a>' +
          '</div>',
        targetBounds: this.getBoundingClientRect()
      })

      d3.selectAll('.vertical-menu a').on('click', function () {

        switch (d3.select(this).attr('action')) {
          case "convert2Node":
            mure.classes[d.classId].interpretAsNodes()
            break;
          case "convert2Edge":
            mure.classes[d.classId].interpretAsEdges()
            break;
          case "delete":
            mure.classes[d.classId].delete();
            break;
        }
        window.mainView.hideTooltip();
      })


    });

    // links.on('click', click);
    TICK_COUNT = 0;
    this.simulation.alpha(.5).restart();
  }



  edgePathGenerator(source, target) {


    //floating edges
    if (source === target) {
      // return 'M' + (-FLOATING_EDGE_LENGTH) + ' 0 L ' + FLOATING_EDGE_LENGTH + ' 0';
      return this.lineGenerator([
        [-FLOATING_EDGE_LENGTH, 0],
        //[0, -FLOATING_EDGE_LENGTH / 4],
        [FLOATING_EDGE_LENGTH, 0]
      ])
    }
    //edge has at least one "anchor"
    // return 'M' + source.x + ' ' + source.y + ' L ' + target.x + ' ' + target.y;
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
      nodeLookup[classObj.classId] = graph.nodes.length;
      graph.nodes.push(classObj);
      if (classObj.type === 'Edge') {
        edgeClasses.push(classObj);
      }
    });

    // Get any links that exist
    edgeClasses.forEach(edgeClass => {
      if (edgeClass.sourceClassId !== null) {
        graph.links.push({
          source: nodeLookup[edgeClass.sourceClassId],
          target: nodeLookup[edgeClass.classId],
          directed: edgeClass.directed
        });
      }
      if (edgeClass.targetClassId !== null) {
        graph.links.push({
          source: nodeLookup[edgeClass.classId],
          target: nodeLookup[edgeClass.targetClassId],
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