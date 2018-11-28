import { View } from '../../node_modules/uki/dist/uki.esm.js';

class Modal extends View {
  constructor ({
    content = '',
    spinner = false,
    ok = null,
    cancel = null,
    prompt = null,
    resources = {}
  } = {}) {
    super(null, resources);
    this.content = content;
    this.spinner = spinner;
    if (ok) {
      this.ok = ok;
    }
    if (cancel) {
      this.cancel = cancel;
    }
    this.prompt = prompt;

    this.response = new Promise((resolve, reject) => {
      this.resolve = resolve;
    });
  }
  setup () {
    if (typeof this.content !== 'function') {
      this.d3el.append('div').html(this.content);
    }
    if (this.spinner) {
      this.d3el.append('img')
        .classed('spinner', true)
        .attr('src', 'img/spinner.gif');
    }
    if (this.prompt !== null) {
      this.d3el.append('input')
        .classed('prompt', true)
        .property('value', this.prompt);
    }
    if (this.ok || this.cancel) {
      const dialogButtons = this.d3el.append('div')
        .classed('dialogButtons', true);
      if (this.cancel) {
        const cancelButton = dialogButtons.append('div')
          .classed('cancel', true)
          .classed('button', true)
          .on('click', () => { this.handleButton(this.cancel); });
        cancelButton.append('a');
        cancelButton.append('span').text('Cancel');
      }
      if (this.ok) {
        const okButton = dialogButtons.append('div')
          .classed('ok', true)
          .classed('button', true)
          .on('click', () => { this.handleButton(this.ok); });
        okButton.append('a');
        okButton.append('span').text('OK');
      }
    }
  }
  draw () {
    if (typeof this.content === 'function') {
      this.content(this.d3el);
    }
  }
  handleButton (response) {
    if (typeof response === 'function') {
      response.call(this, this.resolve);
    } else {
      this.resolve(response);
    }
    window.mainView.hideModal();
  }
}
export default Modal;
