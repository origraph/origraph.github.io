import GoldenLayoutView from './GoldenLayoutView.js';

class HelpView extends GoldenLayoutView {
  constructor (container) {
    super({
      container,
      icon: HelpView.icon,
      label: HelpView.label,
      resources: {
        text: 'docs/index.html'
      }
    });
  }
  setup () {
    super.setup();
    this.contentDiv.html(this.resources.text);
    this.contentDiv.select('.get.started.button')
      .on('click', () => {
        this.openDefaultViews();
      });
    this.contentDiv.selectAll('a[data-example-dataset]')
      .on('click', function () {
        window.mainView.loadExampleFile(this.dataset.exampleDataset);
      });
  }
  async isEmpty () { return false; }
  drawEmptyState () {}
  drawReadyState () {}
  openDefaultViews () {
    window.mainView.loadWorkspace({
      content: [
        {
          type: 'column',
          content: [{
            type: 'row',
            content: [{
              type: 'component',
              componentName: 'NetworkModelView',
              componentState: {}
            }, {
              type: 'component',
              componentName: 'InstanceView',
              componentState: {}
            }]
          }, {
            type: 'row',
            content: [{
              type: 'component',
              componentName: 'TableView',
              componentState: {}
            }]
          }]
        }
      ]
    });
  }
}
HelpView.icon = 'img/help.svg';
HelpView.label = 'Help';
export default HelpView;
