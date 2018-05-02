/* globals d3 */
import MainView from './views/MainView.js';

window.onload = () => {
  window.mainView = new MainView(d3.select('body'));
};
window.onresize = () => {
  if (window.mainView) {
    window.mainView.render();
  }
};
