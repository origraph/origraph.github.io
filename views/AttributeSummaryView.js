/* globals d3 */
import GoldenLayoutView from './GoldenLayoutView.js';

class AttributeSummaryView extends GoldenLayoutView {
  constructor (container) {
    super({
      container,
      icon: AttributeSummaryView.icon,
      label: AttributeSummaryView.label
    });
  }
  async drawReadyState () {
    let histograms = await window.mainView.userSelection.histograms();
    histograms = [{
      key: 'Raw Values',
      value: histograms.raw
    }].concat(d3.entries(histograms.attributes));
    let sections = this.contentDiv.selectAll('details')
      .data(histograms, d => d.key);
    sections.exit().remove();
    let sectionsEnter = sections.enter().append('details');
    sections = sections.merge(sectionsEnter);

    sectionsEnter.append('summary');
    sections.select('summary')
      .text(d => d.key);

    this.drawCategoricalHistogram({
      sectionsEnter,
      sections,
      className: 'typeBins',
      label: 'Item type(s)'
    });
    this.drawCategoricalHistogram({
      sectionsEnter,
      sections,
      className: 'categoricalBins',
      label: 'Categorical value(s)'
    });
    this.drawHistogram({
      sectionsEnter,
      sections,
      className: 'quantitativeBins',
      label: 'Quantitative distribution',
      dataAccessor: histogramSpec => histogramSpec.quantitativeBins || null,
      generateXScaleFunction: ({ histogramSpec }) => histogramSpec.quantitativeScale,
      xAccessor: d => d.x0,
      generateYScaleFunction: ({ data }) => {
        const max = d3.extent(data, bin => bin.length)[1];
        return d3.scaleLinear()
          .domain([0, max]);
      },
      yAccessor: d => d.length,
      generateBandwidthFunction: ({ xScale }) => {
        return (bin) => {
          return Math.max(0, xScale(bin.x1) - xScale(bin.x0) - 1);
        };
      }
    });
  }
  drawCategoricalHistogram ({sectionsEnter, sections, className, label}) {
    this.drawHistogram({
      sectionsEnter,
      sections,
      className,
      label,
      dataAccessor: histogramSpec => histogramSpec.value[className] ? d3.entries(histogramSpec.value[className]) : null,
      generateXScaleFunction: ({ data }) => {
        return d3.scaleBand()
          .domain(data.map(bin => bin.key));
      },
      xAccessor: d => d.key,
      generateYScaleFunction: ({ data }) => {
        const max = d3.extent(data, bin => bin.value)[1];
        return d3.scaleLinear()
          .domain([0, max]);
      },
      yAccessor: d => d.value,
      generateBandwidthFunction: ({ xScale }) => Math.max(0, xScale.bandwidth() - 1)
    });
  }
  drawHistogram ({
    sectionsEnter,
    sections,
    className,
    label,
    dataAccessor,
    generateXScaleFunction,
    xAccessor,
    generateYScaleFunction,
    yAccessor,
    generateBandwidthFunction
  }) {
    sectionsEnter.append('label')
      .classed(className, true)
      .text(label);
    let svgEnter = sectionsEnter.append('svg')
      .classed(className, true);
    svgEnter.append('g')
      .classed('bars', true);
    svgEnter.append('g')
      .classed('x', true)
      .classed('axis', true);
    svgEnter.append('g')
      .classed('y', true)
      .classed('axis', true);

    const self = this;
    sections.each(function (histogramSpec) {
      const data = dataAccessor(histogramSpec);
      d3.select(this).selectAll(`.${className}`)
        .style('display', data === null ? 'none' : null);
      const svg = d3.select(this).select(`svg.${className}`);
      if (data) {
        const margins = {
          left: 50,
          top: 10,
          right: 20,
          bottom: 40
        };
        svg.select('.bars')
          .attr('transform', `translate(${margins.left},${margins.top})`);
        const width = self.contentDiv.node().getBoundingClientRect()
          .width - self.scrollBarSize - margins.left - margins.right;
        const height = 200;
        svg.attr('width', width + margins.left + margins.right)
          .attr('height', height + margins.top + margins.bottom);
        const xScale = generateXScaleFunction({histogramSpec, data})
          .rangeRound([0, width]);
        const yScale = generateYScaleFunction({histogramSpec, data})
          .rangeRound([height, 0]);
        const bandwidth = generateBandwidthFunction({ histogramSpec, data, xScale });

        let bins = svg.select('.bars').selectAll('.bar').data(data);
        bins.exit().remove();
        let binsEnter = bins.enter().append('rect')
          .classed('bar', true);
        bins = bins.merge(binsEnter);

        bins.attr('width', bandwidth)
          .attr('x', bin => xScale(xAccessor(bin)))
          .attr('y', bin => yScale(yAccessor(bin)))
          .attr('height', bin => height - yScale(yAccessor(bin)));

        svg.select('.x.axis')
          .attr('transform', `translate(${margins.left}, ${height + margins.top})`)
          .call(d3.axisBottom(xScale));
        svg.select('.y.axis')
          .attr('transform', `translate(${margins.left}, ${margins.top})`)
          .call(d3.axisLeft(yScale));
      }
    });
  }
}
AttributeSummaryView.icon = 'img/histogram.svg';
AttributeSummaryView.label = 'Attribute Summary';
export default AttributeSummaryView;
