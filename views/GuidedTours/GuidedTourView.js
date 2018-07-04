/* globals d3 */
import GoldenLayoutView from './Common/GoldenLayoutView.js';
import LocatedViewMixin from './Common/LocatedViewMixin.js';
import OperationOptionsRenderer from '../Common/OperationOptionsRenderer.js';

class GuidedTourView extends LocatedViewMixin(GoldenLayoutView) {
  constructor (container, {
    locationSelectorList,
    operationList,
    drawFinishedState = (element) => { this.drawDefaultFinishedState(element); }
  }) {
    super(container, {
      icon: GuidedTourView.icon,
      label: GuidedTourView.label,
      locationSelectorList
    });
    this.operationList = operationList;
    this.currentStep = 0;
    this.drawFinishedState = drawFinishedState;
  }
  setup () {
    super.setup();
    this.container.append('h2')
      .text(this.label);
    this.container.append('p')
      .text(this.description);
    this.container.append('div')
      .classed('steps', true);
    this.container.append('div')
      .classed('allDone', true);
  }
  defaultFinishedState (element) {
    element.text('All done! Go ahead and close this view.');
  }
  async drawReadyState (content) {
    let steps = this.d3el.select('.steps').selectAll('.step')
      .data(this.operationList);
    steps.exit().remove();
    let stepsEnter = steps.enter().append('div')
      .classed('step', true);
    steps = steps.merge(stepsEnter);

    stepsEnter.append('img');
    steps.select('img')
      .attr('src', d => `img/${d.lowerCamelCaseName}.svg`);

    stepsEnter.append('div').classed('stepTitle', true);
    steps.select('.stepTitle').text(d => d.humanReadableName);

    stepsEnter.append('div').classed('settings', true);

    let applyButtonEnter = stepsEnter.append('div')
      .classed('button', true);
    applyButtonEnter.append('a');
    applyButtonEnter.append('span')
      .text('Apply and Continue');

    const self = this;
    steps.each(function (d, i) {
      const el = d3.select(this);
      el.classed('complete', i < self.currentStep);
      el.classed('current', i === self.currentStep);
      el.classed('future', i > self.currentStep);
      if (i === self.currentStep) {
        (async () => {
          let optionRenderer = new OperationOptionsRenderer(
            el.select('.settings'), d, this.location);
          optionRenderer.drawOptions();
          el.select('.button').classed('disabled', !(await optionRenderer.ready()))
            .on('click', async () => {
              if (await optionRenderer.ready()) {
                const settings = await optionRenderer.getSettings();
                this.location = await window.mainView.userSelection
                  .execute(settings.operation, settings.parameters);
                this.currentStep += 1;
              }
            });
        })();
      }
    });

    const allDone = this.d3el.select('.allDone')
      .style('display', this.currentStep >= this.steps.length ? null : 'none');
    if (this.currentStep >= this.steps.length) {
      this.drawFinishedState(allDone);
    }
  }
}
GuidedTourView.icon = 'img/guidedTour.svg';
GuidedTourView.label = 'Guided Tour';
export default GuidedTourView;
