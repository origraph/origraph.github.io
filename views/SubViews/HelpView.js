import GoldenLayoutView from './GoldenLayoutView.js';

class HelpView extends GoldenLayoutView {
  constructor ({ container }) {
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
    this.content.html(this.resources.text);
    this.content.select('.get.started.button')
      .on('click', () => {
        this.openDefaultViews();
      });
    this.content.selectAll('a[data-example-dataset]')
      .on('click', function () {
        window.mainView.loadExampleFile(this.dataset.exampleDataset);
      });
  }
}
HelpView.icon = 'img/help.svg';
HelpView.label = 'Help';
export default HelpView;
