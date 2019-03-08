/* globals Worker */
Worker.onmessage = (event) => {
  // Parse the counts that we got from origraph.js's countAllUniqueValues
  const sourceCounts = JSON.parse(event.data[0]);
  const targetCounts = JSON.parse(event.data[1]);
  // Stitch the index bin with a special string into two series for iterating
  // (because our null convention everywhere else would get stringified and
  // potentially collide):
  const sourceBins = Object.entries(sourceCounts.bins);
  sourceBins.unshift([null, sourceCounts.indexBin]);
  const targetBins = Object.entries(targetCounts.bins);
  targetBins.unshift([null, targetCounts.indexBin]);
  // Look at every attr = attr combo...
  for (const [sourceAttr, sourceBin] of sourceBins) {
    for (const [targetAttr, targetBin] of targetBins) {
      const stat = {
        matches: 0,
        sourceAttr,
        targetAttr,
        sourceDistribution: { '0': 0 },
        targetDistribution: { '0': 0 }
      };
      // Initialize our total value-to-match tallies
      const sourceEdgeCounts = {};
      const targetEdgeCounts = {};
      // Spin through each unique source / target value combo, and the count for
      // how many of each value exist in the class
      for (const [sourceValue, sourceNodeCount] of Object.entries(sourceBin)) {
        for (const [targetValue, targetNodeCount] of Object.entries(targetBin)) {
          if (sourceValue === targetValue) {
            // There are count * count total edges created by this match
            const nMatches = sourceNodeCount * targetNodeCount;
            stat.matches += nMatches;
            // Add to (init if needed) each value-match count; for each source
            // node that matched, it gets targetCount new edges, and vice-versa
            sourceEdgeCounts[sourceValue] = sourceEdgeCounts[sourceValue] || 0;
            sourceEdgeCounts[sourceValue] += targetNodeCount;
            targetEdgeCounts[targetValue] = targetEdgeCounts[targetValue] || 0;
            targetEdgeCounts[targetValue] += sourceNodeCount;
          }
        }
      }
      // Now that we have the total number of edges per node, count + bin nodes
      // by the number of new edges that they have
      for (const [sourceValue, edgeCount] of Object.entries(sourceEdgeCounts)) {
        stat.sourceDistribution[edgeCount] = stat.sourceDistribution[edgeCount] || 0;
        stat.sourceDistribution[edgeCount] += sourceBin[sourceValue];
      }
      for (const [targetValue, edgeCount] of Object.entries(targetEdgeCounts)) {
        stat.targetDistribution[edgeCount] = stat.targetDistribution[edgeCount] || 0;
        stat.targetDistribution[edgeCount] += sourceBin[targetValue];
      }
      // Now that this attribute pairing's stats have been calculated, send it
      // back so it can be accumulated / rendered
      Worker.postMessage(JSON.stringify(stat));
    }
  }
  // Signal that we're done
  Worker.postMessage('done');
};
