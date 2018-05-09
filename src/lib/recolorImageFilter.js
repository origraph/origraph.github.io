/* globals d3 */

d3.select(window).on('load', () => {
  // Extract all filters that look like url(#recolorImageToFFFFFF) from the
  // stylesheets that have been loaded in the document
  const colorScheme = Array.from(document.styleSheets).reduce((acc, styleSheet, sheetIndex) => {
    Array.from(styleSheet.cssRules || styleSheet.rules).forEach((rule, ruleIndex) => {
      if (rule.style && rule.style.filter) {
        let hexCode = /#recolorImageTo(......)/.exec(rule.style.filter);
        if (hexCode && hexCode[1]) {
          acc[hexCode[1]] = acc[hexCode[1]] || [];
          acc[hexCode[1]].push({ sheetIndex, ruleIndex });
        }
      }
    });
    return acc;
  }, {});

  if (d3.select('#recolorImageFilters').size() === 0) {
    let svg = d3.select('body').append('svg')
      .attr('id', 'recolorImageFilters')
      .attr('width', 0)
      .attr('height', 0);
    svg.append('defs');
  }

  // Generate SVG filters that can recolor images to whatever
  // color we need. Styles simply do something like
  // filter: url(#recolorImageToFFFFFF)
  let recolorFilters = d3.select('#recolorImageFilters')
    .selectAll('filter.recolor')
    .data(Object.keys(colorScheme), d => d);
  let recolorFiltersEnter = recolorFilters.enter().append('filter')
    .attr('class', 'recolor')
    .attr('id', d => 'recolorImageTo' + d);
  let cmpTransferEnter = recolorFiltersEnter.append('feComponentTransfer')
    .attr('in', 'SourceAlpha')
    .attr('result', 'color');
  cmpTransferEnter.append('feFuncR')
    .attr('type', 'linear')
    .attr('slope', 0)
    .attr('intercept', d => {
      let hexvalue = d.slice(0, 2);
      return Math.pow(parseInt(hexvalue, 16) / 255, 2);
    });
  cmpTransferEnter.append('feFuncG')
    .attr('type', 'linear')
    .attr('slope', 0)
    .attr('intercept', d => {
      let hexvalue = d.slice(2, 4);
      return Math.pow(parseInt(hexvalue, 16) / 255, 2);
    });
  cmpTransferEnter.append('feFuncB')
    .attr('type', 'linear')
    .attr('slope', 0)
    .attr('intercept', d => {
      let hexvalue = d.slice(4, 6);
      return Math.pow(parseInt(hexvalue, 16) / 255, 2);
    });
});
