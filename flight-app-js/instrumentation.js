const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const {
  ATTR_SERVICE_NAME,
} = require('@opentelemetry/semantic-conventions');

// Enable diagnostic logging (optional)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Configure the OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'flight-app-js',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  metricExporter: new OTLPMetricExporter({
    url: 'http://otel-collector:4318/v1/metrics',
  }),
  logExporter: new OTLPLogExporter({
    url: 'http://otel-collector:4318/v1/logs',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Start the SDK before your application code runs
sdk.start();
