import time
from functools import wraps

# Decorator to measure execution time in ms and add to response
def timed(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        end = time.time()
        if isinstance(result, dict):
            result['time_taken_ms'] = int((end - start) * 1000)
        return result
    return wrapper
