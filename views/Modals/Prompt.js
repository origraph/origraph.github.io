/* globals d3 */
import BaseModal from './BaseModal.js';

class Prompt extends BaseModal {
  async getInput (message, defaultValue = '') {
    return new Promise((resolve, reject) => {
      this.showOverlay({
        message,
        ok: () => {
          const value = d3.select('#overlay .prompt').property('value');
          this.hideOverlay();
          resolve(value);
        },
        cancel: () => { this.hideOverlay(); resolve(null); },
        prompt: defaultValue
      });
    });
  }
}
export default Prompt;
