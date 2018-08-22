import BaseModal from './BaseModal.js';

class Alert extends BaseModal {
  async getInput (message) {
    return new Promise((resolve, reject) => {
      this.showOverlay({
        message,
        ok: () => { this.hideOverlay(); resolve(); }
      });
    });
  }
}
export default Alert;
