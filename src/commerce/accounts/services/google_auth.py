import logging
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests

logger = logging.getLogger(__name__)


class GoogleAuthError(Exception):
    """Custom exception raised when Google token verification fails."""
    pass


def verify_google_id_token(token_string: str) -> dict:
    """
    Verifies a Google OAuth ID token using google-auth.

    Validates:
      1. Signature and token integrity against Google's public keys.
      2. Expiration (exp).
      3. Issuer (iss) in ['accounts.google.com', 'https://accounts.google.com'].
      4. Audience (aud) matches GOOGLE_CLIENT_ID.
      5. Email verified flag (email_verified) is True.

    Returns the verified token payload dictionary on success.
    Raises GoogleAuthError on any validation failure.
    """
    if not token_string or not isinstance(token_string, str) or not token_string.strip():
        raise GoogleAuthError("Google ID token is required.")

    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        logger.error("GOOGLE_CLIENT_ID is not configured in Django settings.")
        raise GoogleAuthError("Google authentication is not configured on this server.")

    try:
        request = requests.Request()
        payload = id_token.verify_oauth2_token(token_string.strip(), request, client_id)
    except ValueError as e:
        logger.warning("Google token verification failed: %s", e)
        raise GoogleAuthError("Invalid or expired Google token.") from e
    except Exception as e:
        logger.error("Unexpected error during Google token verification: %s", e)
        raise GoogleAuthError("Failed to verify Google token.") from e

    # Explicit issuer check
    issuer = payload.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        logger.warning("Google token issuer mismatch: %s", issuer)
        raise GoogleAuthError("Invalid token issuer.")

    # Explicit audience check
    aud = payload.get("aud")
    if aud != client_id:
        logger.warning("Google token audience mismatch: expected %s, got %s", client_id, aud)
        raise GoogleAuthError("Token audience mismatch.")

    # Email verification check
    email_verified = payload.get("email_verified")
    if email_verified not in (True, "true", "True", 1):
        raise GoogleAuthError("Your Google account email address is not verified by Google.")

    email = payload.get("email", "").lower().strip()
    if not email:
        raise GoogleAuthError("Google token did not contain a valid email address.")

    return payload

