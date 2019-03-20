/* globals postMessage, importScripts, d3 */
importScripts('/node_modules/d3/dist/d3.min.js');

const MAX_SUMMARY_BINS = 10;

function summarizeDistribution (distribution) {
  const sourceBins = Object.keys(distribution).map(d => +d);
  if (sourceBins.length > MAX_SUMMARY_BINS) {
    const result = {};
    if (distribution[0]) {
      result[0] = distribution[0];
    }
    if (distribution[1]) {
      result[1] = distribution[1];
    }
    const extent = d3.extent(sourceBins.filter(d => d > 1));
    const interval = (extent[1] - extent[0]) / (MAX_SUMMARY_BINS - Object.keys(result).length);
    for (let i = extent[0]; i < extent[1]; i += interval) {
      const bottom = Math.floor(i);
      let top = Math.floor(i + interval) - 1;
      top = Math.max(bottom, top);
      let key = top === bottom ? bottom : `${bottom}-${top}`;
      result[key] = 0;
      for (let j = bottom; j <= top; j++) {
        result[key] += distribution[j] || 0;
      }
    }
    return result;
  } else {
    return distribution;
  }
}

onmessage = function (message) { // eslint-disable-line no-undef
  // Parse the counts that we got from origraph.js's countAllUniqueValues
  const sourceCounts = JSON.parse(message.data[0]);
  const targetCounts = JSON.parse(message.data[1]);
  // Stitch the index bin with a special string into two series for iterating
  // (because our null convention everywhere else would get stringified and
  // potentially collide):
  const sourceBins = Object.entries(sourceCounts.hashableBins);
  sourceBins.unshift([null, sourceCounts.indexBin]);
  const targetBins = Object.entries(targetCounts.hashableBins);
  targetBins.unshift([null, targetCounts.indexBin]);
  // Look at every attr = attr combo...
  for (const [sourceAttr, sourceBin] of sourceBins) {
    for (const [targetAttr, targetBin] of targetBins) {
      const stat = {
        id: `${sourceAttr === null ? '_origraph_index' : sourceAttr}=${targetAttr === null ? '_origraph_index' : targetAttr}`,
        matches: 0,
        sourceAttr,
        targetAttr,
        sourceDistribution: { '0': (sourceAttr !== null && sourceCounts.unHashableCounts[sourceAttr]) || 0 },
        targetDistribution: { '0': (targetAttr !== null && targetCounts.unHashableCounts[targetAttr]) || 0 },
        sourceOneToOneNess: 0,
        targetOneToOneNess: 0
      };
      // Initialize our total value-to-match tallies
      const sourceConnectionCounts = {};
      const targetConnectionCounts = {};
      // Spin through each unique source / target value combo, and the count for
      // how many of each value exist in the class
      for (const [sourceValue, sourceItemCount] of Object.entries(sourceBin)) {
        for (const [targetValue, targetItemCount] of Object.entries(targetBin)) {
          if (sourceValue === targetValue) {
            // There are count * count total connections created by this match
            const nMatches = sourceItemCount * targetItemCount;
            stat.matches += nMatches;
            // Add to (init if needed) each value-match count; for each source
            // item that matched, it gets targetCount new connections, and vice-versa
            sourceConnectionCounts[sourceValue] = sourceConnectionCounts[sourceValue] || 0;
            sourceConnectionCounts[sourceValue] += targetItemCount;
            targetConnectionCounts[targetValue] = targetConnectionCounts[targetValue] || 0;
            targetConnectionCounts[targetValue] += sourceItemCount;
          }
        }
      }
      // Now that we have the total number of connections per item, count + bin items
      // by the number of new connections that they have
      for (const [sourceValue, connectionCount] of Object.entries(sourceConnectionCounts)) {
        stat.sourceDistribution[connectionCount] = stat.sourceDistribution[connectionCount] || 0;
        stat.sourceDistribution[connectionCount] += sourceBin[sourceValue];
      }
      for (const [targetValue, connectionCount] of Object.entries(targetConnectionCounts)) {
        stat.targetDistribution[connectionCount] = stat.targetDistribution[connectionCount] || 0;
        stat.targetDistribution[connectionCount] += sourceBin[targetValue];
      }
      // We have almost all the counts at this point, with the exception of
      // values that never matched anything; add to the zero bin when a value
      // never matched at all
      for (const [sourceValue, sourceItemCount] of Object.entries(sourceBin)) {
        if (!sourceConnectionCounts[sourceValue]) {
          stat.sourceDistribution[0] += sourceItemCount;
        }
      }
      for (const [targetValue, targetItemCount] of Object.entries(targetBin)) {
        if (!targetConnectionCounts[targetValue]) {
          stat.targetDistribution[0] += targetItemCount;
        }
      }

      // Compute a summary of the distribution, because we really only care about
      // how many things have exactly zero connections; exactly one connection; or
      // many connections
      stat.sourceSummary = summarizeDistribution(stat.sourceDistribution);
      stat.targetSummary = summarizeDistribution(stat.targetDistribution);

      // Compute a heuristic score that suggests the likelihood that this pair
      // of attributes should be the basis for a connection; currently the
      // approach is to score highly when there's mostly a 1-to-1 relationship
      // between items and new connections
      for (const [connectionCount, itemCount] of Object.entries(stat.sourceDistribution)) {
        stat.sourceOneToOneNess += +connectionCount === 0 ? -itemCount : itemCount / connectionCount;
      }
      for (const [connectionCount, itemCount] of Object.entries(stat.targetDistribution)) {
        stat.targetOneToOneNess += +connectionCount === 0 ? -itemCount : itemCount / connectionCount;
      }
      // Now that this attribute pairing's stats have been calculated, send it
      // back so it can be accumulated / rendered
      postMessage(JSON.stringify(stat));
    }
  }
  // Signal that we're done
  postMessage('done');
};
