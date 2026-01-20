const parentSend = process.send;
if (parentSend) {
  process.send = undefined;
}
require('tsx/cjs');
if (parentSend) {
  process.send = parentSend;
}

exports.ProcessPdfJob = require('./src/jobs/ProcessPdfJob').ProcessPdfJob;
exports.ExtractRecipeFromImageJob = require('./src/jobs/ExtractRecipeFromImageJob').ExtractRecipeFromImageJob;
