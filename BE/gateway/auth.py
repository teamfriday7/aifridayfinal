import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from config import SECRET_KEY, JWT_ALGORITHM

def generate_token(user_id="gateway_user", roles=None, expires_in_seconds=3600):
    """Utility to generate valid JWT token for testing and local authentication."""
    if roles is None:
        roles = ["user"]
    payload = {
        "sub": user_id,
        "roles": roles,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in_seconds)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token_str):
    """Decodes and validates a JWT token."""
    try:
        return jwt.decode(token_str, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return None

def require_auth(f):
    """
    Decorator for Layer 1 Authentication.
    Validates either:
    1. mTLS Client Cert Header (X-mTLS-Client-Cert or X-Client-Cert-Verified)
    2. Bearer JWT Token in Authorization header
    Returns 401 Unauthorized if neither is valid.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # 1. Check mTLS header option
        mtls_verified = request.headers.get("X-Client-Cert-Verified")
        mtls_cert = request.headers.get("X-mTLS-Client-Cert")
        if mtls_verified == "SUCCESS" or (mtls_cert and "BEGIN CERTIFICATE" in mtls_cert):
            request.user_context = {"auth_type": "mtls", "client_id": request.headers.get("X-Client-Cert-DN", "mtls_client")}
            return f(*args, **kwargs)

        # 2. Check JWT Authorization Header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({
                "layer": "Layer 1: Local Secure Gateway",
                "status": "EJECT",
                "code": 401,
                "error": "Unauthorized",
                "reason": "Missing Authorization header or mTLS Client Certificate"
            }), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({
                "layer": "Layer 1: Local Secure Gateway",
                "status": "EJECT",
                "code": 401,
                "error": "Unauthorized",
                "reason": "Invalid Authorization header format. Expected 'Bearer <token>'"
            }), 401

        token = parts[1]
        decoded = decode_token(token)
        if not decoded:
            return jsonify({
                "layer": "Layer 1: Local Secure Gateway",
                "status": "EJECT",
                "code": 401,
                "error": "Unauthorized",
                "reason": "Invalid or expired JWT token"
            }), 401

        request.user_context = {"auth_type": "jwt", "payload": decoded, "user_id": decoded.get("sub")}
        return f(*args, **kwargs)

    return decorated
