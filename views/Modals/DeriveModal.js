/* globals CodeMirror */
import Modal from './Modal.js';

class DeriveModal extends Modal {
  constructor (targetClass) {
    super({
      resources: {
        text: 'views/Modals/DeriveModalDocs.html'
      }
    });
    this.targetClass = targetClass;
  }
  setup () {
    this.d3el.html(`
      <div class="DeriveModal">
        <div class="classView">
          <svg class="connectionLayer"></svg>
          <div class="classes"></div>
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

    // Set up CodeMirror
    const argName = this.targetClass.lowerCamelCaseType;
    this.code = CodeMirror(this.d3el.select('#code').node(), {
      theme: 'material',
      mode: 'javascript',
      value: `\
async function (${argName}, otherClasses) {
  // Replace this function with one of the
  // templates on your left.

  // Or you can roll your own; see the docs
  // on your right.

  return ${argName}.index;
}
`});
  }
  draw () {
    // TODO
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
