/* globals d3, CodeMirror */
import Modal from './Modal.js';

const LINE_SPACING = 40;

class DeriveModal extends Modal {
  constructor (targetClass) {
    super({
      resources: {
        text: 'views/Modals/DeriveModalDocs.html'
      }
    });
    this.targetClass = targetClass;
    this.computeClassHierarchy();
  }
  computeClassHierarchy () {
    this.classList = [];
    this.classListLookup = {};
    this.segmentList = [];

    const queue = [{
      parentSegment: null,
      classObj: this.targetClass
    }];

    while (queue.length > 0) {
      const wrapper = queue.shift();
      const index = this.classListLookup[wrapper.classObj.classId];
      if (index !== undefined) {
        continue;
      }
      // Sneaky move to only add the segments when we actually add the classes
      // (parentSegment in the object is just an index, whereas it was an
      // object before)
      let parentSegment = wrapper.parentSegment;
      if (parentSegment !== null) {
        wrapper.parentSegment = this.segmentList.length;
        this.segmentList.push(parentSegment);
      }
      this.classListLookup[wrapper.classObj.classId] = this.classList.length;
      this.classList.push(wrapper);

      // Construct the next segment for each (potential) child
      parentSegment = {
        parentId: wrapper.classObj.classId
      };
      if (wrapper.classObj.type === 'Node') {
        for (const edgeClass of wrapper.classObj.edgeClasses()) {
          parentSegment.color = `#${edgeClass.annotations.color}`;
          parentSegment.childId = edgeClass.classId;
          queue.push({
            parentSegment,
            classObj: edgeClass
          });
        }
      } else if (wrapper.classObj.type === 'Edge') {
        parentSegment.color = `#${wrapper.classObj.annotations.color}`;
        if (wrapper.classObj.sourceClass) {
          parentSegment.childId = wrapper.classObj.sourceClass.classId;
          queue.push({
            parentSegment,
            classObj: wrapper.classObj.sourceClass
          });
        }
        if (wrapper.classObj.targetClass) {
          parentSegment.childId = wrapper.classObj.targetClass.classId;
          queue.push({
            parentSegment,
            classObj: wrapper.classObj.targetClass
          });
        }
      }
    }
  }
  getAncestralSegments (segmentIndex) {
    const result = [];
    let segment = this.segmentList[segmentIndex];
    while (true) {
      const { parentSegment } = this.classList[this.classListLookup[segment.parentId]];
      if (parentSegment === null) {
        break;
      } else {
        segment = this.segmentList[parentSegment];
        result.push(segment);
      }
    }
    return result;
  }
  setup () {
    this.d3el.html(`
      <div class="DeriveModal">
        <div class="connectionView">
          <svg>
            <g class="classLineLayer"></g>
            <g class="segmentLayer"></g>
            <g class="jointLayer"></g>
          </svg>
        </div>
        <div class="tableView">
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

    this.setupTableView();
    this.setupConnectionView();
    this.setupCodeView();
  }
  setupTableView () {
    const self = this;

    // Tables
    let classes = this.d3el.select('.tableView')
      .selectAll('.class').data(this.classList, ({ classObj }) => classObj.classId);
    classes.exit().remove();
    const classesEnter = classes.enter().append('div').classed('class', true);
    classes = classes.merge(classesEnter);

    // Column headers
    classesEnter.append('div').classed('header', true);
    let attrs = classes.select('.header').selectAll('.attr')
      .data(({ classObj, parentSegment }) => {
        return Object.values(classObj.table.getAttributeDetails())
          .map(attr => {
            return { attr, classObj, parentSegment };
          });
      }, d => d.attr.name);
    attrs.exit().remove();
    const attrsEnter = attrs.enter().append('div').classed('attr', true);
    attrs = attrs.merge(attrsEnter);

    // Joint buttons
    attrsEnter.append('div').classed('joints', true);
    let joints = attrs.select('.joints')
      .selectAll('.joint').data(({ attr, classObj, parentSegment }) => {
        return parentSegment === null ? [] : [{ attr, classObj, parentSegment }];
      });
    joints.exit().remove();
    const jointsEnter = joints.enter().append('div')
      .classed('joint', true)
      .classed('button', true)
      .classed('tiny', true);
    joints = joints.merge(jointsEnter);
    jointsEnter.append('a');
    joints.style('background-color', ({ parentSegment }) => this.segmentList[parentSegment].color);
    joints.on('mouseover', ({ parentSegment }) => this.hoverSegment(parentSegment));
    joints.on('mouseout', ({ parentSegment }) => this.hoverSegment(null));
    joints.on('click', function ({ attr, classObj, parentSegment }) {
      self.showAttrReduceMenu({
        attr,
        classObj,
        parentSegment,
        targetBounds: this.getBoundingClientRect()
      });
    });

    // Attribute titles
    attrsEnter.append('div').classed('attrName', true);
    attrs.select('.attrName').text(({ attr }) => attr.name);
  }
  hoverSegment (segmentIndex) {
    if (segmentIndex === null) {

    } else {
      console.log(this.getAncestralSegments(segmentIndex));
    }
  }
  generateCodeBlock (content) {
    const argName = this.targetClass.lowerCamelCaseType;
    return `async function (${argName}, otherClasses) {
  $${content}
}`;
  }
  showAttrReduceMenu ({ attr, classObj, parentSegment, targetBounds }) {
    window.mainView.showContextMenu({
      targetBounds,
      menuEntries: {
        'Sum': {
          onClick: () => {}
        },
        'Concatenate': {
          onClick: () => {}
        }
      }
    });
  }
  setupConnectionView () {
    // TODO: link to tableView's vertical scrolling
  }
  drawConnectionView () {
    // Where are the class headers in tableView?
    const headerBounds = {};
    const width = Math.max(LINE_SPACING * (2 + this.segmentList.length),
      this.d3el.select('.tableView').node().getBoundingClientRect().width);
    let height = 0;
    this.d3el.select('.tableView').selectAll('.class').select('.header')
      .each(function ({ classObj }) {
        headerBounds[classObj.classId] = this.getBoundingClientRect();
        height = Math.max(height, headerBounds[classObj.classId].bottom);
      });

    // Adjust the SVG accordingly
    const svg = this.d3el.select('.connectionView svg')
      .attr('width', width)
      .attr('height', height);

    // Horizontal class lines
    let classLines = svg.select('.classLineLayer').selectAll('.classLine')
      .data(this.classList, ({ classObj }) => classObj.classId);
    classLines.exit().remove();
    const classLinesEnter = classLines.enter().append('g')
      .classed('classLine', true);
    classLines = classLines.merge(classLinesEnter);

    classLinesEnter.append('path');
    classLines.select('path')
      .attr('stroke', ({ classObj }) => `#${classObj.annotations.color}`)
      .attr('d', ({ classObj }) => {
        const bounds = headerBounds[classObj.classId];
        const y = bounds.top;
        return `M0,${y}L${width},${y}`;
      });

    // Vertical segment lines
    let segments = svg.select('.segmentLayer').selectAll('.segment')
      .data(this.segmentList);
    segments.exit().remove();
    const segmentsEnter = segments.enter().append('g').classed('segment', true);
    segments = segments.merge(segmentsEnter);

    segmentsEnter.append('path');
    segments.select('path')
      .style('stroke', ({ color }) => color)
      .attr('d', ({ parentId, childId }, index) => {
        const x = (index + 1) * LINE_SPACING;
        let bounds = headerBounds[parentId];
        const y0 = bounds.top;
        bounds = headerBounds[childId];
        const y1 = bounds.top;
        return `M${x},${y0}L${x},${y1}`;
      });

    // Joints
    const jointedClassList = this.classList
      .filter(({ parentSegment }) => parentSegment !== null);
    let joints = svg.select('.jointLayer').selectAll('.joint')
      .data(jointedClassList, ({ classObj }) => classObj.classId);
    joints.exit().remove();
    const jointsEnter = joints.enter().append('g').classed('joint', true);
    joints = joints.merge(jointsEnter);

    joints.attr('transform', ({ parentSegment, classObj }) => {
      const x = (parentSegment + 1) * LINE_SPACING;
      const y = headerBounds[classObj.classId].top;
      return `translate(${x},${y})`;
    });
    jointsEnter.append('circle')
      .attr('r', 5)
      .attr('fill', ({ parentSegment }) => this.segmentList[parentSegment].color);
  }
  setupCodeView () {
    const argName = this.targetClass.lowerCamelCaseType;
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
  drawCodeView () {
    // TODO: Highlight the first and last lines as readOnly
  }
  draw () {
    this.drawCodeView();
    this.drawConnectionView();
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
