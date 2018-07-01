import GoldenLayoutView from './GoldenLayoutView.js';

class NetworkModelView extends GoldenLayoutView {
  constructor (container) {
    super({
      container,
      icon: NetworkModelView.icon,
      label: NetworkModelView.label
    });
  }
  async getEmptyState () {
    const temp = await super.getEmptyState();
    if (temp) { return temp; }
    const networkModel = await window.mainView.navigationContext.getFlatGraphSchema();
    if (networkModel.nodeClasses.length === 0 || networkModel.edgeSets.length === 0) {
      return emptyStateDiv => {
        emptyStateDiv.html('<img class="emptyState" src="img/noNodesEmptyState.svg"/>');
      };
    }
  }
  async drawReadyState (contentDiv) {
    contentDiv.html('todo');
  }
}
NetworkModelView.icon = 'img/networkModel.svg';
NetworkModelView.label = 'Network Model';
export default NetworkModelView;
