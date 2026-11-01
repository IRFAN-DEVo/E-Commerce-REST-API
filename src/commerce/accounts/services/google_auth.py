import logging
from django.conf import settings
from google.auth import exceptions as google_exceptions
from google.auth.transport import requests
from google.oauth2 import id_token

logger = logging.getLogger(__name__)


class GoogleAuthError(Exception):
    """Custom exception raised when Google token verification fails."""
    pass


def _mask_email(email: str) -> str:
    """Mask email for safe diagnostic logging."""
    if not email or "@" not in email:
        return "***"
    user, domain = email.split("@", 1)
    visible_len = min(2, len(user))
    return f"{user[:visible_len]}***@{domain}"


def _safe_token_preview(token: str) -> str:
    """Returns safe structural information about token without leaking sensitive signature bytes."""
    if not token or not isinstance(token, str):
        return "empty"
    parts = token.split(".")
    part_lengths = [len(p) for p in parts]
    return f"length={len(token)}, segments={len(parts)}, segment_lengths={part_lengths}"


def verify_google_id_token(token_string: str) -> dict:
    """
    Verifies a Google OAuth ID token using google-auth.

    Validates:
      1. Token presence and structural validity (header.payload.signature).
      2. Environment configuration (GOOGLE_CLIENT_ID).
      3. Signature and token integrity against Google's public certs.
      4. Expiration (exp) and issued-at (iat) with clock skew tolerance.
      5. Audience (aud) matches backend GOOGLE_CLIENT_ID.
      6. Issuer (iss) in ['accounts.google.com', 'https://accounts.google.com'].
      7. Email verified flag (email_verified) is True.

    Returns the verified token payload dictionary on success.
    Raises GoogleAuthError on any validation failure.
    """
    # 1. Missing token check
    if not token_string or not isinstance(token_string, str) or not token_string.strip():
        logger.warning(
            "[GOOGLE_AUTH_DIAGNOSTIC] Category: Missing token. Request payload did not contain id_token."
        )
        raise GoogleAuthError("Google ID token is required.")

    # 2. Environment configuration check
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        logger.error(
            "[GOOGLE_AUTH_DIAGNOSTIC] Category: Environment configuration mismatch. "
            "GOOGLE_CLIENT_ID is not configured in Django settings or environment."
        )
        raise GoogleAuthError("Google authentication is not configured on this server.")

    cleaned_token = token_string.strip()

    # 3. Structural validation check
    segments = cleaned_token.split(".")
    if len(segments) != 3:
        logger.warning(
            "[GOOGLE_AUTH_DIAGNOSTIC] Category: Malformed token. Expected 3 JWT segments, got %d. Token: %s",
            len(segments),
            _safe_token_preview(cleaned_token),
        )
        raise GoogleAuthError("Malformed Google ID token.")

    # 4. Cryptographic and claims verification with Google
    try:
        request = requests.Request()
        # clock_skew_in_seconds=120 allows 2 minutes leeway to accommodate
        # standard clock drift between client/host machines and Google atomic clocks.
        payload = id_token.verify_oauth2_token(
            cleaned_token,
            request,
            audience=client_id,
            clock_skew_in_seconds=120,
        )
    except google_exceptions.InvalidValue as e:
        err_msg = str(e)
        err_lower = err_msg.lower()
        if "audience" in err_lower or "recipient" in err_lower:
            logger.warning(
                "[GOOGLE_AUTH_DIAGNOSTIC] Category: Audience mismatch. Details: %s | Expected client_id: %s...",
                err_msg,
                client_id[:12],
            )
            raise GoogleAuthError("Google token audience mismatch.") from e
        elif "expired" in err_lower:
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Expired token. Details: %s", err_msg)
            raise GoogleAuthError("Google token has expired. Please sign in again.") from e
        elif "used too early" in err_lower:
            logger.warning(
                "[GOOGLE_AUTH_DIAGNOSTIC] Category: Clock skew / timing issue. Details: %s",
                err_msg,
            )
            raise GoogleAuthError("Google token used too early. Please check your system clock.") from e
        else:
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Invalid token value. Details: %s", err_msg)
            raise GoogleAuthError("Invalid Google token.") from e

    except google_exceptions.MalformedError as e:
        err_msg = str(e)
        if "signature" in err_msg.lower():
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Invalid signature. Details: %s", err_msg)
            raise GoogleAuthError("Invalid Google token signature.") from e
        else:
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Malformed token. Details: %s", err_msg)
            raise GoogleAuthError("Malformed Google ID token.") from e

    except google_exceptions.TransportError as e:
        logger.error(
            "[GOOGLE_AUTH_DIAGNOSTIC] Category: Transport error fetching Google certificates: %s",
            e,
        )
        raise GoogleAuthError("Unable to reach Google authentication servers. Please try again.") from e

    except google_exceptions.GoogleAuthError as e:
        err_msg = str(e)
        if "issuer" in err_msg.lower() or "iss" in err_msg.lower():
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Issuer mismatch. Details: %s", err_msg)
            raise GoogleAuthError("Invalid Google token issuer.") from e
        else:
            logger.warning(
                "[GOOGLE_AUTH_DIAGNOSTIC] Category: Google authentication verification error: %s",
                err_msg,
            )
            raise GoogleAuthError("Failed to verify Google token.") from e

    except ValueError as e:
        err_msg = str(e)
        err_lower = err_msg.lower()
        if "audience" in err_lower or "recipient" in err_lower:
            logger.warning(
                "[GOOGLE_AUTH_DIAGNOSTIC] Category: Audience mismatch. Details: %s | Expected client_id: %s...",
                err_msg,
                client_id[:12],
            )
            raise GoogleAuthError("Google token audience mismatch.") from e
        elif "expired" in err_lower:
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Expired token. Details: %s", err_msg)
            raise GoogleAuthError("Google token has expired. Please sign in again.") from e
        elif "signature" in err_lower:
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Invalid signature. Details: %s", err_msg)
            raise GoogleAuthError("Invalid Google token signature.") from e
        elif "used too early" in err_lower:
            logger.warning(
                "[GOOGLE_AUTH_DIAGNOSTIC] Category: Clock skew / timing issue. Details: %s",
                err_msg,
            )
            raise GoogleAuthError("Google token used too early. Please check your system clock.") from e
        else:
            logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Malformed or invalid token. Details: %s", err_msg)
            raise GoogleAuthError("Invalid Google token.") from e

    except Exception as e:
        logger.error("[GOOGLE_AUTH_DIAGNOSTIC] Category: Unexpected verification error: %s", e)
        raise GoogleAuthError("Failed to verify Google token.") from e

    # 5. Explicit issuer check
    issuer = payload.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        logger.warning(
            "[GOOGLE_AUTH_DIAGNOSTIC] Category: Issuer mismatch. Got iss=%s, expected accounts.google.com",
            issuer,
        )
        raise GoogleAuthError("Invalid Google token issuer.")

    # 6. Explicit audience check
    aud = payload.get("aud")
    if aud != client_id:
        logger.warning(
            "[GOOGLE_AUTH_DIAGNOSTIC] Category: Audience mismatch. aud=%s... does not match expected client_id=%s...",
            str(aud)[:12] if aud else "None",
            client_id[:12],
        )
        raise GoogleAuthError("Google token audience mismatch.")

    # 7. Email verification check
    email_verified = payload.get("email_verified")
    if email_verified not in (True, "true", "True", 1):
        logger.warning(
            "[GOOGLE_AUTH_DIAGNOSTIC] Category: Unverified email. User email is not marked verified by Google."
        )
        raise GoogleAuthError("Your Google account email address is not verified by Google.")

    email = payload.get("email", "").lower().strip()
    if not email:
        logger.warning("[GOOGLE_AUTH_DIAGNOSTIC] Category: Missing email claim in payload.")
        raise GoogleAuthError("Google token did not contain a valid email address.")

    logger.info(
        "[GOOGLE_AUTH_DIAGNOSTIC] Successfully verified Google token for email: %s",
        _mask_email(email),
    )
    return payload
