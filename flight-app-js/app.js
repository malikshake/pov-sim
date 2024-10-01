require('./instrumentation.js'); // Initialize OpenTelemetry SDK

const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const utils = require('./utils.js');
const { trace, metrics } = require('@opentelemetry/api');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');

const tracer = trace.getTracer('flight-app-js');
const meter = metrics.getMeter('flight-app-js');
const logger = logs.getLogger('flight-app-js');

// Create custom metrics
const requestCounter = meter.createCounter('root_endpoint_requests', {
  description: 'Counts number of requests to root endpoint',
});

const randomIntHistogram = meter.createHistogram('random_int_generated', {
  description: 'Records the random int generated in /flights endpoint',
});

const AIRLINES = ['AA', 'UA', 'DL'];

const app = express();

const swaggerDocs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Flight App',
      version: '1.0.0',
      description: 'A simple Express Flight App',
    },
  },
  apis: ['app.js'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /:
 *   get:
 *     summary: No-op home endpoint
 *     responses:
 *       200:
 *         description: Returns ok
 */
app.get('/', (req, res) => {
  // Increment the counter metric
  requestCounter.add(1);

  // Custom log
  const attributes = {
    'endpoint': 'root'
  }
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: 'Root endpoint was called',
    attributes
  });  

  res.send({'message': 'ok'});
});

/**
 * @swagger
 * /airlines/{err}:
 *   get:
 *     summary: Get airlines endpoint. Set err to "raise" to trigger an exception.
 *     parameters:
 *       - in: path
 *         name: err
 *         type: string
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - raise
 *     responses:
 *       200:
 *         description: Returns a list of airlines
 */
app.get('/airlines/:err?', (req, res) => {
  if (req.params.err === 'raise') {
    const err = new Error('Raise test exception');
    console.log('Error in /airlines endpoint:', err.message);
    const attributes = {
      'endpoint': 'airlines'
    }
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: `Error in /airlines endpoint: ${err.message}`,
      attributes
    });  
    throw err;    
  }

  // Custom log
  const attributes = {
    'endpoint': 'airlines'
  }
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: 'Airlines endpoint accessed.',
    attributes
  });  

  res.send({'airlines': AIRLINES});
});

/**
 * @swagger
 * /flights/{airline}/{err}:
 *   get:
 *     summary: Get flights endpoint. Set err to "raise" to trigger an exception.
 *     parameters:
 *       - in: path
 *         name: airline
 *         type: string
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - AA
 *             - UA
 *             - DL
 *       - in: path
 *         name: err
 *         type: string
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - raise
 *     responses:
 *       200:
 *         description: Returns a list of airlines
 */
app.get('/flights/:airline/:err?', (req, res) => {
  if (req.params.err === 'raise') {
    const err = new Error('Raise test exception');
    const attributes = {
      'endpoint': '/flights'
    }
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: `Error in /flights endpoint: ${err.message}`,
      attributes
    });  
    throw err;
  }
  // Start a custom span
  const span = tracer.startSpan('generate_random_int');

  const randomInt = utils.getRandomInt(100, 999);

  // Record the random int in the histogram metric
  randomIntHistogram.record(randomInt);

  // Custom log
  const attributes = {
    'endpoint': 'flights'
  }
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: `Flights endpoint accessed for airline ${req.params.airline} with random int ${randomInt}`,
    attributes
  });  

  // End the custom span
  span.end();

  res.send({[req.params.airline]: [randomInt]});
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: `Server is running on http://localhost:${PORT}`
  });  
});
