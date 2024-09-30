from flask import Flask, jsonify
from flasgger import Swagger
from utils import get_random_int

# OpenTelemetry imports
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_NAME, Resource

from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter

from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor

from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor

import logging
import sys

# Define resource attributes
resource = Resource(attributes={
    SERVICE_NAME: "flight-app-py"
})

# Set up Traces
trace_provider = TracerProvider(resource=resource)
trace.set_tracer_provider(trace_provider)
otlp_trace_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")
trace_processor = BatchSpanProcessor(otlp_trace_exporter)
trace_provider.add_span_processor(trace_processor)

# Set up Metrics
metric_exporter = OTLPMetricExporter(endpoint="http://otel-collector:4318/v1/metrics")
metric_reader = PeriodicExportingMetricReader(metric_exporter)
metrics_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(metrics_provider)

# Set up Logs
logger_provider = LoggerProvider(resource=resource)
set_logger_provider(logger_provider)

logging_exporter = OTLPLogExporter(endpoint="http://otel-collector:4318/v1/logs")
log_processor = BatchLogRecordProcessor(logging_exporter)
logger_provider.add_log_record_processor(log_processor)
handler = logging.StreamHandler(sys.stdout)

handler = LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)
handler.setLevel(logging.INFO)
logging.getLogger().addHandler(handler)

app = Flask(__name__)
Swagger(app)

# Instrument Flask
FlaskInstrumentor().instrument_app(app)

# Get meter and tracer
meter = metrics.get_meter(__name__)
tracer = trace.get_tracer(__name__)

# Define custom metrics
root_counter = meter.create_counter(
    name="root_request_counter",
    description="Counts the number of requests to the root endpoint",
    unit="1",
)

random_int_histogram = meter.create_histogram(
    name="random_int_histogram",
    description="Records the random int generated in the /flights endpoint",
    unit="1",
)

AIRLINES = ["AA", "UA", "DL"]

@app.route("/")
def home():
    # Increment custom counter metric
    root_counter.add(1)

    # Custom log
    logging.info("Root endpoint accessed.")

    return jsonify({"message": "ok"})

@app.route("/airlines/", defaults={'err': None})
@app.route("/airlines/<err>")
def get_airlines(err=None):
    """Get airlines endpoint. Set err to "raise" to trigger an exception.
    ---
    parameters:
      - name: err
        in: path
        type: string
        enum: ["raise"]
        required: false
    responses:
      200:
        description: Returns a list of airlines
    """
    if err == "raise":
        raise Exception("Raise test exception")

    # Custom log
    logging.info("Airlines endpoint accessed.")

    return jsonify({"airlines": AIRLINES})

@app.route("/flights/<airline>/<err>")
def get_flights(airline, err=None):
    """Get flights endpoint. Set err to "raise" to trigger an exception.
    ---
    parameters:
      - name: airline
        in: path
        type: string
        enum: ["AA", "UA", "DL"]
        required: true
      - name: err
        in: path
        type: string
        enum: ["raise"]
        required: false
    responses:
      200:
        description: Returns a list of flights for the selected airline
    """
    if err == "raise":
        raise Exception("Raise test exception")

    # Start a custom span
    with tracer.start_as_current_span("generate_random_int") as span:
        random_int = get_random_int(100, 999)
        span.set_attribute("random_int", random_int)
        span.set_attribute("airline", airline)

    # Record the random int in the histogram
    random_int_histogram.record(random_int, attributes={"airline": airline})

    # Custom log
    logging.info(f"Flights endpoint accessed for airline {airline} with random int {random_int}.")

    return jsonify({airline: [random_int]})

if __name__ == "__main__":
    app.run(debug=True)
