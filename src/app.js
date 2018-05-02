import MainView from './views/MainView.js';

window.onload = () => {
  window.mainView = new MainView();
};
window.onresize = () => {
  if (window.mainView) {
    window.mainView.render();
  }
};
