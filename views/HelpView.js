/* globals d3, mure */
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
      .on('click', async function () {
        const filename = this.dataset.exampleDataset;
        let fileContents;
        try {
          fileContents = await d3.text(`docs/exampleDatasets/${filename}`);
        } catch (err) {
          mure.warn(err);
        }
        mure.uploadString(filename, null, null, fileContents);
      });
  }
  draw () {}
}
HelpView.icon = 'img/help.svg';
HelpView.label = 'Help';
export default HelpView;
