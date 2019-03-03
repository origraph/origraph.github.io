import Modal from './Modal.js';

class HtmlModal extends Modal {
  constructor ({
    url,
    ok = null,
    cancel = null,
    checkboxText = null
  }) {
    super({ content: '', ok, cancel, resources: [{ type: 'text', url }] });
    this.customStyling = true;
    this.checkboxText = checkboxText;
  }
  setup () {
    this.content = this.resources[0];
    super.setup();
    this.d3el.classed('HtmlModal', true);
    if (this.checkboxText) {
      const checkbox = this.d3el.select('.dialogButtons')
        .insert('div', ':first-child')
        .classed('checkbox', true);
      checkbox.append('input')
        .attr('type', 'checkbox')
        .property('checked', !window.localStorage.getItem('skipIntro'));
      checkbox.append('label')
        .text(this.checkboxText);
    }
  }
}

export default HtmlModal;
