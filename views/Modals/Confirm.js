import BaseModal from './BaseModal.js';

class Confirm extends BaseModal {
  async getInput (message) {
    return new Promise((resolve, reject) => {
      this.showOverlay({
        message,
        ok: () => { this.hideOverlay(); resolve(true); },
        cancel: () => { this.hideOverlay(); resolve(false); }
      });
    });
  }
}
export default Confirm;
