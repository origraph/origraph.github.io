/* globals mure, d3 */
import GoldenLayoutView from './GoldenLayoutView.js';
import SvgViewMixin from './SvgViewMixin.js';

const NODE_SIZE = 35;
const FLOATING_EDGE_LENGTH = 100;
const EDGE_STUB_LENGTH = 25;
const MENU_SIZE = 25;
let TICK_COUNT = 0;

class NetworkModelView extends SvgViewMixin(GoldenLayoutView) {
  constructor ({
    container,
    state
  }) {
    super({
      container,
      icon: NetworkModelView.icon,
      label: NetworkModelView.label
    });
  }
  isEmpty () {
    return Object.keys(mure.classes).length === 0;
  }
  setup () {
    super.setup();

    this.content.on('click', () => window.mainView.hideTooltip());
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink()) // .distance(50)) //.id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-NODE_SIZE))
      .force('center', d3.forceCenter())
      .force('collide', d3.forceCollide().radius(NODE_SIZE));

    this.lineGenerator = d3.line()
      .curve(d3.curveBasis);

    // flag to monitor if user is dragging (supress mouseover callbacks)
    this.dragging = false;
    // flag to monitor mouseover to render self/edges
    this.sourceMousedOver = false;
    this.sourceDrag = undefined;

    // flag to monitor mouseover to connect edges
    this.targetDrag = 'default';

    let self = this;
    this.simulation.on('tick', () => {
      TICK_COUNT = TICK_COUNT + 1;
      if (TICK_COUNT > 5) {
        this.simulation.stop();
      }

      // ensure the network model stays within the bounds of the visible area of this view.
      const bounds = this.getContentBounds(this.content);

      d3.selectAll('.object').attr('transform', node => {
        node.x = Math.max(NODE_SIZE, Math.min(bounds.width - NODE_SIZE, node.x));
        node.y = Math.max(NODE_SIZE, Math.min(bounds.height - NODE_SIZE, node.y));
        return `translate(${node.x},${node.y})`;
      });

      d3.selectAll('.edge').select('.nodeObject')
        .attr('d', function (d) {
          let source = mure.classes[d.sourceClassId] ? mure.classes[d.sourceClassId] : d;
          let target = mure.classes[d.targetClassId] ? mure.classes[d.targetClassId] : d;

          return self.edgePathGenerator(source, target, d3.select(this.parentNode), d);
        });

      d3.selectAll('.edge').select('.sourceHandle')
        .attr('cx', function (d) {
          let source = mure.classes[d.sourceClassId] ? mure.classes[d.sourceClassId] : d;
          let out = self.normalize(source, d3.select(this.parentNode));
          return source === d ? -FLOATING_EDGE_LENGTH - 10 : out[0];
        })
        .attr('cy', function (d) {
          let source = mure.classes[d.sourceClassId] ? mure.classes[d.sourceClassId] : d;
          let out = self.normalize(source, d3.select(this.parentNode));
          return source === d ? 0 : out[1];
        });

      d3.selectAll('.edge').select('.targetHandle')
        .attr('cx', function (d) {
          let target = mure.classes[d.targetClassId] ? mure.classes[d.targetClassId] : d;
          let out = self.normalize(target, d3.select(this.parentNode));
          return target === d ? +FLOATING_EDGE_LENGTH : out[0];
        })
        .attr('cy', function (d) {
          let target = mure.classes[d.targetClassId] ? mure.classes[d.targetClassId] : d;
          let out = self.normalize(target, d3.select(this.parentNode));
          return target === d ? 0 : out[1];
        });
    });

    // create markers for edge endpoints
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
    }];

    let defs = this.content.append('svg:defs');
    defs.selectAll('marker')
      .data(markers)
      .enter()
      .append('svg:marker')
      .attr('id', function (d) {
        return 'marker_' + d.name;
      })
      .attr('markerHeight', 2)
      .attr('markerWidth', 2)
      .attr('markerUnits', 'strokeWidth')
      .attr('orient', 'auto')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('viewBox', function (d) {
        return d.viewbox;
      })
      .append('svg:path')
      .attr('d', function (d) {
        return d.path;
      });

    this.linkLayer = this.content.append('g').classed('linkLayer', true);
    this.nodeLayer = this.content.append('g').classed('nodeLayer', true);

    // set drag behavior
    let dragstarted = (d) => {
      // Keep track of dragging to inhibit mouseover events
      this.dragging = true;
      this.sourceDrag = d;

      if (typeof d !== 'string') {
        d.fx = d.fy = null;
      }
    };

    let dragended = async function (d) {
      // Keep track of dragging to inhibit mouseover events
      self.dragging = false;

      let dragObject = d3.select(this).attr('class');

      // reset edge stub to it's original position
      if (dragObject.includes('anchor')) {
        d3.select(this.parentNode).select('.anchor')
          .attr('d', self.lineGenerator(
            [
              [0, 0],
              [NODE_SIZE + EDGE_STUB_LENGTH, 0]
            ]
          ));
      }

      // Dragged a node
      d.fx = d.x;
      d.fy = d.y;

      if (self.targetDrag && (self.targetDrag !== d || dragObject.includes('anchor'))) {
        let sourceNode = d;
        let targetNode = self.targetDrag;

        let sourceAttr = window.mainView.getAttributes(sourceNode.classId);
        let targetAttr = window.mainView.getAttributes(targetNode.classId);

        // Create empty tooltip
        window.mainView.showTooltip({
          content: ' ',
          targetBounds: this.getBoundingClientRect()
        });

        let menu = d3.select('#tooltip')
          .selectAll('.vertical-menu')
          .data([{
            'role': 'source',
            'node': sourceNode
          }, {
            'role': 'target',
            'node': targetNode
          }]);

        let menuEnter = menu.enter().append('div');

        menu.exit().remove();

        menu = menuEnter.merge(menu);

        menu.attr('class', d => d.role);
        menu.classed('vertical-menu', true);

        let headers = menu.selectAll('.active').data(d => [d.node.className]);

        headers.enter().append('a')
          .attr('href', '#')
          .attr('class', 'active')
          .html(d => d);

        let menuItems = menu.selectAll('.menuItem').data(d => d.role === 'source' ? sourceAttr : targetAttr);

        menuItems.enter().append('a')
          .attr('href', '#')
          .attr('class', 'menuItem')
          .text(d => d);

        d3.select('#tooltip').append('div').attr('class', 'menu-submit').append('a').attr('href', '#').text('Connect');

        // set listeners for each menu
        d3.selectAll('.vertical-menu').selectAll('.menuItem').on('click', function (d) {
          d3.select(this).classed('selected', !d3.select(this).classed('selected'));
        });

        d3.select('.menu-submit').on('click', () => {
          let selectedAttr = d3.select('#tooltip').selectAll('.selected');

          for (const element of selectedAttr.nodes()) {
            let parent = d3.select(element.parentNode).datum();

            let id = parent.node.classId;
            let attr = d3.select(element).text();

            mure.classes[id].addHashFunction(attr, function * (wrappedItem) {
              yield wrappedItem.rawItem[attr];
            });
          }

          let sourceNode = d3.select('#tooltip').select('.source').datum().node;
          let targetNode = d3.select('#tooltip').select('.target').datum().node;

          // let sourceId = sourceNode.classId;
          // let targetId = targetNode.classId;

          // let sourceHash = d3.select('#tooltip').select('.source').select('.selected').text();
          // let targetHash = d3.select('#tooltip').select('.target').select('.selected').text();

          if (dragObject === 'sourceHandle' || dragObject === 'targetHandle') {
            dragObject === 'sourceHandle' ? sourceNode.sourceClassId = targetNode.classId : sourceNode.targetClassId = targetNode.classId;

            self.draw();

            // console.log('Source is Edge')
            // mure.classes[sourceId].connectToNodeClass({
            //   nodeClass: mure.classes[targetId],
            //   direction: 'target',
            //   nodeHashName: targetHash,
            //   edgeHashName: sourceHash
            // });
          } else if (sourceNode.type === 'Node' && targetNode.type === 'Node') {

            // console.log(sourceId,targetId,sourceHash,targetHash)
            // mure.classes[sourceId].connectToNodeClass({
            //   otherNodeClass: mure.classes[targetId],
            //   directed: true, // or false
            //   thisHashName: sourceHash,
            //   otherHashName: targetHash
            // });
          }
        });
      }
    };

    let dragged = function (d) {
      let mouse = d3.mouse(d3.select(this.parentNode).node());

      mouse[0] = mouse[0] - 10;
      mouse[1] = mouse[1] - 10;

      let dragObject = d3.select(this).attr('class');

      if (dragObject === 'targetHandle' || dragObject === 'sourceHandle') {
        d3.select(this)
          .attr('cx', mouse[0])
          .attr('cy', mouse[1]);

        d3.select(this.parentNode).select('.nodeObject').attr('d', () => {
          let handle = dragObject === 'targetHandle' ? d3.select(this.parentNode).select('.sourceHandle') : d3.select(this.parentNode).select('.targetHandle');
          let coords = dragObject === 'targetHandle' ? [
            [handle.attr('cx'), handle.attr('cy')], mouse
          ] : [mouse, [handle.attr('cx'), handle.attr('cy')]];
          return self.lineGenerator(coords);
        });

        // position text
        d3.select(this.parentNode).selectAll('.textGroup')
          .attr('transform', function () {
            let parent = d3.select(this.parentNode).select('.nodeObject').node().getBoundingClientRect();
            let handle = dragObject === 'targetHandle' ? d3.select(this.parentNode).select('.sourceHandle') : d3.select(this.parentNode).select('.targetHandle');
            let currentObj = d3.select(this.parentNode).select('.' + dragObject);
            let translate;
            if (Number(handle.attr('cy')) < Number(d3.select(this.parentNode).select('.' + dragObject).attr('cy'))) {
              if (Number(handle.attr('cx')) < Number(currentObj.attr('cx'))) {
                translate = 'translate(' + (parent.width / 2 + Number(handle.attr('cx'))) + ',' + (parent.height / 2) + ')';
              } else {
                translate = 'translate(' + (Number(currentObj.attr('cx')) + parent.width / 2) + ',' + (parent.height / 2) + ')';
              }
            } else {
              if (Number(handle.attr('cx')) < Number(currentObj.attr('cx'))) {
                translate = 'translate(' + (parent.width / 2 + Number(handle.attr('cx'))) + ',' + (-parent.height / 2) + ')';
              } else {
                translate = 'translate(' + (Number(currentObj.attr('cx')) + parent.width / 2) + ',' + (-parent.height / 2) + ')';
              }
            }
            return translate;
          });

        d3.select(this.parentNode).selectAll('.icons')
          .attr('transform', function () {
            let parent = d3.select(this.parentNode).select('.nodeObject').node().getBoundingClientRect();
            let text = d3.select(this.parentNode).select('.textGroup');
            let textBoundingRect = text.node().getBoundingClientRect();
            let handle = dragObject === 'targetHandle' ? d3.select(this.parentNode).select('.sourceHandle') : d3.select(this.parentNode).select('.targetHandle');
            let currentObj = d3.select(this.parentNode).select('.' + dragObject);
            let offset = MENU_SIZE * 2;
            let out;

            let textTransform = self.parse(text.attr('transform'));
            let translate = textTransform.translate ? textTransform.translate[0] : 0;

            if (Number(handle.attr('cy')) < Number(d3.select(this.parentNode).select('.' + dragObject).attr('cy'))) {
              if (Number(handle.attr('cx')) < Number(currentObj.attr('cx'))) {
                out = 'translate(' + (Number(translate) + textBoundingRect.width / 2 - offset) + ',' + (parent.height / 2 - MENU_SIZE * 2) + ')';
              } else {
                out = 'translate(' + (Number(translate) + textBoundingRect.width / 2 - offset) + ',' + (parent.height / 2 - MENU_SIZE * 2) + ')';
              }
            } else {
              if (Number(handle.attr('cx')) < Number(currentObj.attr('cx'))) {
                out = 'translate(' + (Number(translate) + textBoundingRect.width / 2 - offset) + ',' + (-parent.height / 2 - MENU_SIZE * 2) + ')';
              } else {
                out = 'translate(' + (Number(translate) + textBoundingRect.width / 2 - offset) + ',' + (-parent.height / 2 - MENU_SIZE * 2) + ')';
              }
            }
            return out;
          });
      } else if (dragObject.includes('anchor')) {
        // check to see if user is dragging over the source node:
        if (self.sourceMousedOver) {
          // create preview of self edge;
          d3.select(this.parentNode).select('.anchor')
            .attr('d', d => d.type === 'Node' ? self.lineGenerator(
              [
                [NODE_SIZE * 0.9, -NODE_SIZE / 2],
                [NODE_SIZE * 1.5, -NODE_SIZE / 3],
                [NODE_SIZE * 1.5, NODE_SIZE / 3],
                [NODE_SIZE, NODE_SIZE / 2]
              ]
            ) : '');
        } else {
          // have the edge be a straight line to the mouse pointer
          d3.select(this.parentNode).select('.anchor')
            .attr('d', d => d.type === 'Node' ? self.lineGenerator(
              [
                [0, 0], mouse
              ]
            ) : '');
        }
      } else {
        d3.select(this)
          .attr('transform', node => {
            node.x = d3.event.x;
            node.y = d3.event.y;
            return `translate(${d3.event.x},${d3.event.y})`;
          });
      }
    };

    this.drag = d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  draw () {
    console.log('calling draw');
    const self = this;
    const bounds = this.getContentBounds(this.content);
    const graph = this.deriveGraph();

    // console.log(bounds, graph);
    console.log(graph);

    this.simulation.force('center')
      .x(bounds.width / 2)
      .y(bounds.height / 2);

    this.simulation.nodes(graph.nodes);
    this.simulation.force('link')
      .links(graph.links);

    // //Fix the position of all nodes
    this.simulation.on('end', () => {
      console.log('done');
      // graph.nodes.map(n=>{n.fx = n.x; n.fy = n.y;})
    });

    let nodes = this.nodeLayer.selectAll('.object')
      .data(graph.nodes, d => d.classId);
    nodes.exit().remove();

    let nodesEnter = nodes.enter().append('g')
      .classed('object', true);

    nodesEnter.append('path')
      .attr('class', 'anchorMouseCatcher');

    nodesEnter.append('path')
      .attr('class', 'anchor')
      .style('stroke-dasharray', '3px 2px');

    nodesEnter.append('path').attr('class', 'nodeObject').attr('id', d => d.classId); // diamond, circle, or line
    let textGroup = nodesEnter.append('g').attr('class', 'textGroup');
    textGroup.append('rect').classed('textBackground', true);
    textGroup.append('text').append('textPath'); // class Name
    let g = nodesEnter.append('g').attr('class', 'icons');

    g.append('image').attr('class', 'nodeIcon');
    g.append('image').attr('class', 'edgeIcon');
    g.append('image').attr('class', 'deleteIcon');

    // for edges, append two endpoints to the edge line
    nodesEnter.append('circle')
      .attr('class', 'sourceHandle');

    nodesEnter.append('circle')
      .attr('class', 'targetHandle');

    nodes = nodes.merge(nodesEnter);

    // let edgeNodes = nodes.filter(n => n.type === 'Edge');
    // let nonEdgeNodes = nodes.filter(n => n.type !== 'Edge');

    nodes.select('.anchor')
      .attr('opacity', 0)
      .attr('marker-end', d => d.type === 'Node' ? 'url(#marker_circle)' : '');

    nodes.select('.anchorMouseCatcher')
      .attr('opacity', 0);

    nodes.select('.edgeIcon')
      .attr('xlink:href', (d) => d.type === 'Edge' ? '' : '../img/edge2.svg')
      .attr('x', d => d.type === 'Generic' ? MENU_SIZE + 5 : 0);

    nodes.select('.nodeIcon')
      .attr('xlink:href', (d) => d.type === 'Node' ? '' : '../img/node2.svg')
      .attr('x', 0); // d => d.type === 'Node' ? NODE_SIZE - MENU_SIZE : MENU_SIZE)

    nodes.select('.deleteIcon')
      .attr('xlink:href', '../img/delete2.svg')
      .attr('x', d => d.type === 'Generic' ? 2 * MENU_SIZE + 10 : MENU_SIZE + 5);

    nodes.selectAll('.nodeIcon,.deleteIcon')
      .attr('height', MENU_SIZE)
      .attr('width', MENU_SIZE)
      .attr('y', d => d.type === 'Node' ? NODE_SIZE / 2 - MENU_SIZE / 2 : 0);

    nodes.selectAll('.edgeIcon')
      .attr('height', (d) => d.type === 'Edge' ? 0 : MENU_SIZE);

    nodes.select('.icons').attr('transform', function (d) {
      let iconSize = d3.select(this).node().getBoundingClientRect();
      return d.type === 'Edge' ? '' : 'translate(' + -(iconSize.width / 2) + ',' + (d.type === 'Edge' ? NODE_SIZE / 2 : -NODE_SIZE / 2) + ')';
    });

    d3.selectAll('.anchor,.anchorMouseCatcher')
      .attr('d', d => d.type === 'Node' ? this.lineGenerator(
        [
          [0, 0],
          [NODE_SIZE + EDGE_STUB_LENGTH, 0]
        ]
      ) : '');

    nodes
      .call(this.drag);

    // nodes.select('.targetHandle').attr('marker-end', d => d.type === 'Edge' ? 'url(#marker_circle)' : '')
    // nodes.select('.sourceHandle').attr('marker-start', d => d.type === 'Edge' ? 'url(#marker_circle)' : '')

    nodes.selectAll('.sourceHandle,.targetHandle')
      .attr('r', d => d.type === 'Edge' ? NODE_SIZE / 4 : 0);
    nodes.selectAll('.sourceHandle,.targetHandle').call(this.drag);
    nodes.attr('class', d => d.type.toLowerCase());
    nodes.classed('object', true);

    d3.selectAll('.anchor,.anchorMouseCatcher').call(this.drag);

    // Draw actual node/edges
    nodes.select('.nodeObject').attr('d', function (d) {
      let xr = d.type === 'Node' || d.type === 'Generic' ? Math.round(NODE_SIZE) : Math.round(NODE_SIZE / 8);
      let yr = d.type === 'Node' || d.type === 'Generic' ? NODE_SIZE * 1.3 : Math.round(NODE_SIZE / 8);

      let diamondPath = 'M0 ' + -yr + ' l ' + xr + ' ' + yr + ' l' + -xr + ' ' + (yr) + ' ' + 'l' + -xr + ' ' + -yr + 'Z';
      let circlePath = 'M0,0' + 'm' + -NODE_SIZE + ',0' + 'a' + NODE_SIZE + ',' + NODE_SIZE + ' 0 1,0 ' + (2 * NODE_SIZE) + ',0' + 'a' + NODE_SIZE + ',' + NODE_SIZE + ' 0 1,0 ' + -(2 * NODE_SIZE) + ',0Z';

      switch (d.type) {
        case 'Node':
          return circlePath;
        case 'Edge':

          let source = mure.classes[d.sourceClassId] ? mure.classes[d.sourceClassId] : d;
          let target = mure.classes[d.targetClassId] ? mure.classes[d.targetClassId] : d;
          let edge = self.edgePathGenerator(source, target, d3.select(this.parentNode), d);
          return edge;
        case 'Generic':
          return diamondPath;
      }
    });

    // edgeNodes.select('textPath').text(d => d.className)
    // edgeNodes.select('textPath').attr('href', d => '#' + d.classId);
    // edgeNodes.select('textPath').attr('startOffset', '10');

    nodes.select('text').text(d => d.className); // type === 'Node' ? 'nodeClass' : ''); //(d => d.type === 'Node' ? d.className : '');
    nodes.select('text').style('text-anchor', 'middle');

    nodes.select('.textBackground')
      .attr('width', function (d) {
        return d.type === 'Edge' ? d3.select(this.parentNode).select('text').node().getBoundingClientRect().width : 0;
      })
      .attr('height', function (d) {
        return d.type === 'Edge' ? d3.select(this.parentNode).select('text').node().getBoundingClientRect().height : 0;
      })
      .attr('x', function () {
        return -d3.select(this.parentNode).select('text').node().getBoundingClientRect().width / 2;
      })
      .attr('y', function () {
        return -d3.select(this.parentNode).select('text').node().getBoundingClientRect().height * 0.75;
      });

    // nodes.select('text').attr('x',function(d) {
    //   switch (d.type) {
    //     case 'Edge':
    //       let parent = d3.select(this.parentNode).node().getBoundingClientRect();
    //       return - parent.width / 2 // -NODE_SIZE/2
    //     default:
    //       return 0
    //   }
    // })

    nodes.select('.textGroup').attr('transform', function (d) {
      let y;
      switch (d.type) {
        case 'Edge':
          let parent = d3.select(this.parentNode).node().getBoundingClientRect();
          y = -parent.height / 2; // -NODE_SIZE/2
          break;
        default:
          y = NODE_SIZE + 20;
      }
      return 'translate(0,' + y + ')';
    });

    // nodes.select('text').attr('y',function(d) {
    //   switch (d.type) {
    //     case 'Edge':
    //       let parent = d3.select(this.parentNode).node().getBoundingClientRect();
    //       return - parent.height / 2 // -NODE_SIZE/2
    //     default:
    //       return NODE_SIZE + 20
    //   }
    // })

    // self = this;
    const hover = function (d) {
      if (self.dragging) {
        return;
      }
      d3.selectAll('.anchor,.anchorMouseCatcher')
        .attr('opacity', 0);

      d3.select(this).selectAll('.anchor,.anchorMouseCatcher')
        .attr('opacity', 1);

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
    // const click = async d => {
    //   window.mainView.setUserSelection(await this.location.filter({
    //     className: d.key
    //   }));
    // };
    nodes.on('mouseenter', hover);

    nodes.select('.nodeObject').on('mouseover', (d) => {
      this.targetDrag = d;
      this.sourceMousedOver = this.sourceDrag && d.classId === this.sourceDrag.classId;
    });

    nodes.select('.nodeObject').on('mouseout', (d) => {
      this.targetDrag = d.className;
      this.sourceMousedOver = false;
    });

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
      });

      d3.selectAll('.vertical-menu a').on('click', function () {
        switch (d3.select(this).attr('action')) {
          case 'convert2Node':
            mure.classes[d.classId].interpretAsNodes();
            break;
          case 'convert2Edge':
            mure.classes[d.classId].interpretAsEdges();
            break;
          case 'delete':
            mure.classes[d.classId].delete();
            break;
        }
        window.mainView.hideTooltip();
      });
    });

    // links.on('click', click);
    TICK_COUNT = 0;
    this.simulation.alpha(0.5).restart();
  }

  edgePathGenerator (source, target, parentNode, edgeNode) {
    // floating edges
    if (source === target) {
      return this.lineGenerator([
        [-FLOATING_EDGE_LENGTH, 0],
        [FLOATING_EDGE_LENGTH, 0]
      ]);
    }

    // get parent offset;
    let translate = this.parse(parentNode.attr('transform')).translate;

    if (source.type === 'Edge') {
      var m = [source.x, source.y];

      var p = this.closestPoint(d3.select('#' + target.classId).node(), m);

      p = [target.x, target.y];
      return this.lineGenerator([
        [-FLOATING_EDGE_LENGTH, edgeNode.y - translate[1]],
        [FLOATING_EDGE_LENGTH, edgeNode.y - translate[1]],
        [p[0] - translate[0], p[1] - translate[1]]
      ]);
    }

    if (target.type === 'Edge') {
      m = [target.x, target.y];

      p = this.closestPoint(d3.select('#' + source.classId).node(), m);

      p = [source.x, source.y];
      return this.lineGenerator([
        [p[0] - translate[0], p[1] - translate[1]],
        [-FLOATING_EDGE_LENGTH, edgeNode.y - translate[1]],
        [FLOATING_EDGE_LENGTH, edgeNode.y - translate[1]]
      ]);
    }

    var sourceM = [source.x, source.y];
    var targetM = [target.x, target.y];
    let sourceP = this.closestPoint(d3.select('#' + target.classId).node(), sourceM);
    let targetP = this.closestPoint(d3.select('#' + source.classId).node(), targetM);

    sourceP = [source.x, source.y];
    targetP = [target.x, target.y];

    return this.lineGenerator([
      [sourceP[0] - translate[0], sourceP[1] - translate[1]],
      // [-FLOATING_EDGE_LENGTH, edgeNode.y-translate[1]],
      // [FLOATING_EDGE_LENGTH, edgeNode.y-translate[1]],
      [targetP[0] - translate[0], targetP[1] - translate[1]]
    ]);

    // edge has at least one "anchor"
    // return 'M' + (source.x - translate[0]) + ' ' + (source.y - translate[1]) + ' L ' + (target.x - translate[0]) + ' ' + (target.y - translate[1]);
  }

  // accounts for group transform and returns absolute position of nodes in translated group.
  normalize (node, parentNode) {
    let translate = this.parse(parentNode.attr('transform')).translate;
    return [node.x - translate[0], node.y - translate[1]];
  }

  // function to parse out transforms into x and y offsets
  parse (a) {
    var b = {};
    for (var i in a = a.match(/(\w+\((-?\d+\.?\d*e?-?\d*,?)+\))+/g)) {
      var c = a[i].match(/[\w.-]+/g);
      b[c.shift()] = c;
    }
    return b;
  }

  deriveGraph () {
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
