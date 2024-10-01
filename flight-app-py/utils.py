import random
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def get_random_int(min_val, max_val):
    """
    Returns a random int between min_val and max_val, inclusive
    """
    with tracer.start_as_current_span("get_random_int") as span:
        result = random.randint(min_val, max_val)
        span.set_attribute("result", result)
        return result
