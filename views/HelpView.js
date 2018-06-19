import { ScrollableGoldenLayoutView } from './GoldenLayoutView.js';

class HelpView extends ScrollableGoldenLayoutView {
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
  draw () {}
  openDefaultViews () {
    window.mainView.loadWorkspace({
      content: [
        {
          type: 'row',
          content: [{
            type: 'column',
            content: [{
              type: 'row',
              content: [{
                type: 'component',
                componentName: 'RawDataView',
                componentState: {}
              }, {
                type: 'component',
                componentName: 'SetView',
                componentState: {}
              }, {
                type: 'component',
                componentName: 'NetworkModelView',
                componentState: {}
              }]
            }, {
              type: 'row',
              content: [{
                type: 'component',
                componentName: 'InstanceView',
                componentState: {}
              }, {
                type: 'component',
                componentName: 'TableView',
                componentState: {}
              }]
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
