/* globals d3, mure */

console.log('d3 version:', d3.version);
console.log('mure version:', mure.version);

// Example of listening for changes
mure.db.changes({
  since: 'now'
}).on('change', function (change) {
  console.log('change detected', change);
});

// Example of creating an empty document
(async () => {
  await mure.db.put({
    _id: 'empty document test'
  }).catch(error => {
    console.warn('error', error.message);
  });

  let doc = await mure.getStandardizedDoc('empty document test');

  console.log(doc);
})();
