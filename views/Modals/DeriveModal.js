/* globals d3, origraph, CodeMirror */
import Modal from './Modal.js';

const NODE_RADIUS = 30;
const NODE_PADDING = 40;
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
M${-NODE_RADIUS},${-EDGE_THICKNESS}\
L${NODE_RADIUS},${-EDGE_THICKNESS}\
L${NODE_RADIUS},${EDGE_THICKNESS}\
L${-NODE_RADIUS},${EDGE_THICKNESS}\
Z`
};

class DeriveModal extends Modal {
  constructor (targetClass) {
    super({
      resources: {
        text: 'views/Modals/DeriveModalDocs.html'
      }
    });
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
      layerNumber: 0,
      classObj: this.targetClass
    }];
    const links = {};

    while (queue.length > 0) {
      let { layerNumber, classObj } = queue.shift();
      if (this.classLookup[classObj.classId] !== undefined) {
        continue;
      }

      this.classLookup[classObj.classId] = this.allClasses.length;
      this.allClasses.push(classObj);
      const layer = this.layers[layerNumber] = this.layers[layerNumber] || [];
      this.layerLookup[classObj.classId] = { layerNumber, index: layer.length };
      layer.push(classObj.classId);

      layerNumber++;
      if (classObj.type === 'Node') {
        for (const edgeClass of classObj.edgeClasses()) {
          if (!links[edgeClass.classId] || !links[edgeClass.classId][classObj.classId]) {
            links[classObj.classId] = links[classObj.classId] || {};
            links[classObj.classId][edgeClass.classId] = true;
          }
          queue.push({
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
    const lastId = this.currentPath[this.currentPath.length - 1];
    const nextSeries = this.shortestPath(lastId, classId);
    if (nextSeries === null) {
      throw new Error(`Can't find route to unconnected classId: ${classId}`);
    }
    this.currentPath = this.currentPath.concat(nextSeries.slice(1, nextSeries.length));
    this.render();
  }
  generateCodeBlock (content) {
    const argName = this.targetClass.lowerCamelCaseType;
    return `async function (${argName}, otherClasses) {
${content}
}`;
  }
  setup () {
    this.d3el.html(`
      <div class="DeriveModal">
        <div class="templateView">
          <div class="modelView">
            <svg>
              <g class="lightLinkLayer"></g>
              <g class="activeLinkLayer"></g>
              <g class="classLayer"></g>
            </svg>
          </div>
          <div class="breadcrumb"></div>
          <div class="selectorView">
            <select id="functionSelect" size="10">
              <option disabled>Custom</option>
              <optgroup label="Internal">
                <option selected>Duplicate</option>
              </optgroup>
              <optgroup label="Summary" disabled>
                <option>Count</option>
              </optgroup>
              <optgroup label="Attribute-based" disabled>
                <option>Median</option>
                <option>Mean</option>
                <option>Mode</option>
                <option>Concatenate</option>
              </optgroup>
            </select>
            <select id="attrSelect" size="10">
              <option value="">Index</option>
              <optgroup label="Attributes">
              </optgroup>
            </select>
          </div>
        </div>
        <div class="codeView">
          <div class="attrNameHeader">
            <label for="attrName">New Attribute Name:</label>
            <input type="text" id="attrName"/>
          </div>
          <div id="code"></div>
        </div>
        <div class="docsView">${this.resources.text}</div>
      </div>
    `);
    super.setup();
    // Align the buttons to the bottom instead of floating in the center
    this.d3el.select('.center')
      .classed('center', false)
      .classed('bottom', true);

    this.setupCodeView();
  }
  setupCodeView () {
    const argName = this.targetClass.lowerCamelCaseType;
    // this.d3el.select('#code').style('bottom', this.scrollBarSize + 'px');
    this.code = CodeMirror(this.d3el.select('#code').node(), {
      theme: 'material',
      mode: 'javascript',
      value: this.generateCodeBlock(`\
  // Replace this function with one of the
  // templates on your left.

  // Or you can roll your own; see the docs
  // on your right.

  return ${argName}.index;`)
    });
    // Don't allow the user to edit the first or last lines
    this.code.on('beforeChange', (cm, change) => {
      if (change.from.line === 0 || change.to.line === cm.lastLine()) {
        change.cancel();
      }
    });
  }
  drawModelView () {
    // Compute SVG size
    const svg = this.d3el.select('.modelView svg');
    const height = NODE_PADDING + (NODE_PADDING + 2 * NODE_RADIUS) *
      Math.max(...Object.values(this.layers).map(layer => layer.length));
    const width = NODE_PADDING + (NODE_PADDING + 2 * NODE_RADIUS) *
      Object.values(this.layers).length;
    svg.attr('width', width)
      .attr('height', height);

    // Helper values / functions
    const transition = d3.transition().duration(400);
    const computeClassCenter = classId => {
      return {
        x: (NODE_PADDING + 2 * NODE_RADIUS) *
          this.layerLookup[classId].layerNumber +
          NODE_PADDING + NODE_RADIUS,
        y: (NODE_PADDING + 2 * NODE_RADIUS) *
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
      source.x += NODE_RADIUS;
      const target = computeClassCenter(link.target);
      target.x -= NODE_RADIUS;
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
      .classed('focused', classObj => this.currentPath[this.currentPath.length - 1] === classObj.classId);

    classesEnter.append('path');
    classes.select('path')
      .attr('d', classObj => NODE_OUTLINES[classObj.type])
      .attr('fill', classObj => `#${classObj.annotations.color}`);

    classesEnter.append('text');
    classes.select('text')
      .attr('y', NODE_RADIUS + LABEL_PADDING)
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
  drawCurrentPath () {
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
        return `#${origraph.currentModel.classes[classId].annotations.color}`;
      }).on('click', (classId, index) => {
        this.currentPath.splice(index + 1);
        this.render();
      });

    // Breadcrumb separator
    classesEnter.append('div').classed('separator', true)
      .text('>');
  }
  drawSelectorView () {
    // TODO: populate / set up the selection views
  }
  draw () {
    this.drawModelView();
    this.drawCurrentPath();
    this.drawSelectorView();
  }
  ok (resolve) {
    // TODO
    resolve(true);
  }
  cancel (resolve) {
    resolve();
  }
}

export default DeriveModal;
