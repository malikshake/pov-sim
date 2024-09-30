// utils.js

const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('flight-app-tracer');

/*
 * Returns a random int between minVal and maxVal, inclusive
 */
function getRandomInt(minVal, maxVal) {
  const span = tracer.startSpan('utils.getRandomInt');
  const result = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
  span.end();
  return result;
}

module.exports = {
  getRandomInt: getRandomInt,
};
