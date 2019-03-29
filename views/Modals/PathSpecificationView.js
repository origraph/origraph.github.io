/* globals d3, origraph */
import { View } from '../../node_modules/uki/dist/uki.esm.js';

const NODE_RADIUS = 20;
const NODE_PADDING = 50;
const LABEL_PADDING = 15;

const EDGE_THICKNESS = NODE_RADIUS / 5;
const NODE_OUTLINES = {
  // Circle for node classes
  'Node': `\
M0,${-NODE_RADIUS}\
A${NODE_RADIUS},${NODE_RADIUS},0,1,1,0,${NODE_RADIUS}\
A${NODE_RADIUS},${NODE_RADIUS},0,1,1,0,${-NODE_RADIUS}`,
  // Rectangles for edge classes
  'Edge': `\
M${-EDGE_THICKNESS},${-NODE_RADIUS}\
L${-EDGE_THICKNESS},${NODE_RADIUS}\
L${EDGE_THICKNESS},${NODE_RADIUS}\
L${EDGE_THICKNESS},${-NODE_RADIUS}\
Z`
};

class PathSpecificationView extends View {
  constructor (targetClass) {
    super();
    this.targetClass = targetClass;
    this.computeLayout();
    this.currentPath = [this.targetClass.classId];
  }
  computeLayout () {
    this.allClasses = [];
    this.classLookup = {};
    this.layers = {};
    this.layerLookup = {};
    this.connections = [];

    const queue = [{
      parentIndex: 0,
      layerNumber: 0,
      classObj: this.targetClass
    }];
    const links = {};

    while (queue.length > 0) {
      let { parentIndex, layerNumber, classObj } = queue.shift();
      if (this.classLookup[classObj.classId] !== undefined) {
        continue;
      }

      this.classLookup[classObj.classId] = this.allClasses.length;
      this.allClasses.push(classObj);
      const layer = this.layers[layerNumber] = this.layers[layerNumber] || [];
      while (layer.length < parentIndex - 1) {
        // dummy nodes to ensure that children always progress from their parent
        layer.push(null);
      }
      this.layerLookup[classObj.classId] = { layerNumber, index: layer.length };
      layer.push(classObj.classId);

      layerNumber++;
      parentIndex = layer.length;
      if (classObj.type === 'Node') {
        for (const edgeClass of classObj.edgeClasses()) {
          if (!links[edgeClass.classId] || !links[edgeClass.classId][classObj.classId]) {
            links[classObj.classId] = links[classObj.classId] || {};
            links[classObj.classId][edgeClass.classId] = true;
          }
          queue.push({
            parentIndex,
            layerNumber,
            classObj: edgeClass
          });
        }
      } else if (classObj.type === 'Edge') {
        const sourceClass = classObj.sourceClass;
        if (sourceClass) {
          if (!links[sourceClass.classId] || !links[sourceClass.classId][classObj.classId]) {
            links[classObj.classId] = links[classObj.classId] || {};
            links[classObj.classId][sourceClass.classId] = true;
          }
          queue.push({
            parentIndex,
            layerNumber,
            classObj: sourceClass
          });
        }
        const targetClass = classObj.targetClass;
        if (targetClass) {
          if (!links[targetClass.classId] || !links[targetClass.classId][classObj.classId]) {
            links[classObj.classId] = links[classObj.classId] || {};
            links[classObj.classId][targetClass.classId] = true;
          }
          queue.push({
            parentIndex,
            layerNumber,
            classObj: targetClass
          });
        }
      }

      for (const [ sourceId, targetIds ] of Object.entries(links)) {
        for (const targetId of Object.keys(targetIds)) {
          this.connections.push({
            source: sourceId,
            target: targetId
          });
        }
      }
    }
  }
  shortestPath (sourceId, targetId) {
    const visited = {};
    const queue = [[sourceId]];
    while (queue.length > 0) {
      const path = queue.shift();
      const classId = path[path.length - 1];
      if (classId === targetId) {
        return path;
      } else if (visited[classId]) {
        continue;
      }
      visited[classId] = true;
      const classObj = origraph.currentModel.classes[classId];
      if (classObj.type === 'Node') {
        for (const edgeClass of classObj.edgeClasses()) {
          queue.push(path.concat([edgeClass.classId]));
        }
      } else if (classObj.type === 'Edge') {
        if (classObj.sourceClassId) {
          queue.push(path.concat([classObj.sourceClassId]));
        }
        if (classObj.targetClassId) {
          queue.push(path.concat([classObj.targetClassId]));
        }
      }
    }
    return null;
  }
  addClassIdToPath (classId) {
    const nextSeries = this.shortestPath(this.currentClassId, classId);
    if (nextSeries === null) {
      throw new Error(`Can't find route to unconnected classId: ${classId}`);
    }
    this.currentPath = this.currentPath.concat(nextSeries.slice(1, nextSeries.length));
    this.trigger('pathChange');
    this.render();
  }
  get currentClassId () {
    return this.currentPath[this.currentPath.length - 1];
  }
  setup () {
    this.d3el.classed('DeriveModal', true).html(`
        <h3>Choose a path</h3>
        <div class="breadcrumb"></div>
        <div class="modelView">
          <svg>
            <g class="lightLinkLayer"></g>
            <g class="activeLinkLayer"></g>
            <g class="classLayer"></g>
          </svg>
        </div>
    `);
  }
  draw () {
    this.drawModelView();
    this.drawBreadcrumb();
  }
  drawModelView () {
    // Compute SVG size
    const svg = this.d3el.select('.modelView svg');
    const width = NODE_PADDING + (NODE_PADDING + 2 * NODE_RADIUS) *
      Math.max(...Object.values(this.layers).map(layer => layer.length));
    const height = NODE_PADDING + (NODE_PADDING + 2 * NODE_RADIUS) *
      Object.values(this.layers).length;
    svg.attr('width', width)
      .attr('height', height);

    // Helper values / functions
    const transition = d3.transition().duration(400);
    const computeClassCenter = classId => {
      return {
        y: (NODE_PADDING + 2 * NODE_RADIUS) *
          this.layerLookup[classId].layerNumber +
          NODE_PADDING + NODE_RADIUS,
        x: (NODE_PADDING + 2 * NODE_RADIUS) *
          this.layerLookup[classId].index +
          NODE_PADDING + NODE_RADIUS
      };
    };
    const computeClassTransform = classObj => {
      const { x, y } = computeClassCenter(classObj.classId);
      return `translate(${x},${y})`;
    };
    const computeLinkPath = link => {
      const source = computeClassCenter(link.source);
      source.y += NODE_RADIUS;
      const target = computeClassCenter(link.target);
      target.y -= NODE_RADIUS;
      return `M${source.x},${source.y}L${target.x},${target.y}`;
    };

    // Init classes
    let classes = svg.select('.classLayer').selectAll('.class')
      .data(this.allClasses, classObj => classObj.classId);
    classes.exit().remove();
    const classesEnter = classes.enter().append('g')
      .classed('class', true);
    classes = classesEnter.merge(classes);

    // Set up class interaction
    classes.on('click', classObj => {
      this.addClassIdToPath(classObj.classId);
    });

    // Position classes
    classesEnter.attr('transform', computeClassTransform);
    classes.transition(transition).attr('transform', computeClassTransform);

    // Draw classes
    classes.classed('active', classObj => this.currentPath.indexOf(classObj.classId) !== -1)
      .classed('focused', classObj => this.currentClassId === classObj.classId);

    classesEnter.append('path');
    classes.select('path')
      .attr('d', classObj => NODE_OUTLINES[classObj.type])
      .attr('fill', classObj => `#${window.mainView.getClassColor(classObj)}`);

    classesEnter.append('text');
    classes.select('text')
      .attr('y', classObj => {
        if (this.layerLookup[classObj.classId].index % 2 === 0) {
          return NODE_RADIUS + LABEL_PADDING;
        } else {
          return -NODE_RADIUS - LABEL_PADDING / 2;
        }
      })
      .attr('text-anchor', 'middle')
      .text(classObj => classObj.className);

    // Init light links
    let lightLinks = svg.select('.lightLinkLayer').selectAll('.link')
      .data(this.connections, d => d.source + '>' + d.target);
    lightLinks.exit().remove();
    const lightLinksEnter = lightLinks.enter().append('path')
      .classed('link', true);
    lightLinks = lightLinksEnter.merge(lightLinks);

    // Position light links
    lightLinksEnter.attr('d', computeLinkPath);
    lightLinks.transition(transition).attr('d', computeLinkPath);

    // Init active links
    const activeLinkList = this.connections.filter(link => {
      return this.currentPath.indexOf(link.source) !== -1 &&
        this.currentPath.indexOf(link.target) !== -1;
    });
    let activeLinks = svg.select('.activeLinkLayer').selectAll('.link')
      .data(activeLinkList, d => d.source + '>' + d.target);
    activeLinks.exit().attr('opacity', 1)
      .transition(transition)
      .attr('opacity', 0)
      .remove();
    const activeLinksEnter = activeLinks.enter().append('path')
      .classed('link', true);
    activeLinksEnter.attr('opacity', 0)
      .transition(transition)
      .attr('opacity', 1);
    activeLinks = activeLinksEnter.merge(activeLinks);

    // Position active links
    activeLinksEnter.attr('d', computeLinkPath);
    activeLinks.transition(transition).attr('d', computeLinkPath);
  }
  drawBreadcrumb () {
    // Draw class chunks
    let classes = this.d3el.select('.breadcrumb').selectAll('.class')
      .data(this.currentPath, classId => classId);
    classes.exit().remove();
    const classesEnter = classes.enter().append('div').classed('class', true);
    classes = classesEnter.merge(classes);

    // Class labels
    classesEnter.append('div').classed('className', true);
    classes.select('.className')
      .text(classId => origraph.currentModel.classes[classId].className)
      .style('color', classId => {
        return `#${window.mainView.getClassColor(origraph.currentModel.classes[classId])}`;
      }).on('click', (classId, index) => {
        this.currentPath.splice(index + 1);
        this.trigger('pathChange');
        this.render();
      });

    // Breadcrumb separator
    classesEnter.append('div').classed('separator', true)
      .text('>');
  }
}

export default PathSpecificationView;
