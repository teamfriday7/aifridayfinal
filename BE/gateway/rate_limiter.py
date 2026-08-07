from flask import jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

def init_rate_limiter(app):
    """
    Initializes Flask-Limiter for Layer 2 rate limiting.
    Ejects with 429 Too Many Requests when limits are exceeded.
    """
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["100 per minute", "20 per second"],
        storage_uri="memory://"
    )

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "layer": "Layer 1: Local Secure Gateway",
            "status": "EJECT",
            "code": 429,
            "error": "Too Many Requests",
            "reason": f"Rate limit exceeded: {e.description}"
        }), 429

    return limiter
