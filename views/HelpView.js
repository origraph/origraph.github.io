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
    this.contentDiv.selectAll('a[data-example-dataset]')
      .on('click', function () {
        window.mainView.loadExampleFile(this.dataset.exampleDataset);
      });
  }
  draw () {}
}
HelpView.icon = 'img/help.svg';
HelpView.label = 'Help';
export default HelpView;
