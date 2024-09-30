const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const {SimpleLogRecordProcessor,} = require('@opentelemetry/sdk-logs');
const {
  ATTR_SERVICE_NAME,
} = require('@opentelemetry/semantic-conventions');

// Enable diagnostic logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Set up the resource
const resource = new Resource({
  [ATTR_SERVICE_NAME]: 'flight-app-js',
});

// Configure the SDK
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `http://otel-collector:4318/v1/metrics`,
    }),
    exportIntervalMillis: 60000,
  }),
  logRecordProcessor: new SimpleLogRecordProcessor(new OTLPLogExporter({
    url: `http://otel-collector:4318/v1/logs`,
  })),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Start the SDK before your application code runs
sdk.start();
