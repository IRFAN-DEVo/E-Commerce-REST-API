import abc
import logging
from typing import NamedTuple, List, Dict, Any
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from accounts.utils.phone import mask_phone_number

logger = logging.getLogger(__name__)


class SMSResult(NamedTuple):
    success: bool
    error_message: str = ""
    message_id: str = ""


class BaseSMSProvider(abc.ABC):
    @abc.abstractmethod
    def send_sms(self, to_phone: str, message: str) -> SMSResult:
        """
        Sends an SMS to the destination phone number.
        Must return an SMSResult.
        Never log secret credentials or unmasked sensitive OTPs.
        """
        pass


class DummySMSProvider(BaseSMSProvider):
    """
    In-memory SMS provider for automated testing.
    Records all dispatched messages without network requests.
    """
    sent_messages: List[Dict[str, Any]] = []

    def send_sms(self, to_phone: str, message: str) -> SMSResult:
        entry = {
            "to_phone": to_phone,
            "message": message,
        }
        self.sent_messages.append(entry)
        logger.info("DummySMSProvider captured message to %s", mask_phone_number(to_phone))
        return SMSResult(success=True, message_id=f"dummy_{len(self.sent_messages)}")

    @classmethod
    def clear(cls):
        cls.sent_messages.clear()


class ConsoleSMSProvider(BaseSMSProvider):
    """
    Development-only SMS provider that writes to standard stdout.
    STRICT SECURITY RULE: Must NEVER be enabled in production environments (when DEBUG is False).
    """

    def __init__(self):
        if not getattr(settings, "DEBUG", False):
            raise ImproperlyConfigured(
                "ConsoleSMSProvider cannot be enabled in production when DEBUG=False. "
                "Configure a valid production SMS provider."
            )

    def send_sms(self, to_phone: str, message: str) -> SMSResult:
        masked = mask_phone_number(to_phone)
        print("\n" + "=" * 60)
        print(f"[SMS CONSOLE PROVIDER] To: {masked}")
        print(f"[SMS MESSAGE] {message}")
        print("=" * 60 + "\n")
        return SMSResult(success=True, message_id="console_msg")


class TwilioSMSProvider(BaseSMSProvider):
    """
    Twilio SMS integration provider.
    Reads credentials strictly from server-side environment settings.
    """

    def __init__(self):
        self.account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "").strip()
        self.auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "").strip()
        self.from_number = getattr(settings, "TWILIO_PHONE_NUMBER", "").strip()
        self.messaging_service_sid = getattr(settings, "TWILIO_MESSAGING_SERVICE_SID", "").strip()

        if not self.account_sid or not self.auth_token:
            raise ImproperlyConfigured(
                "Twilio SMS provider requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to be configured."
            )
        if not self.from_number and not self.messaging_service_sid:
            raise ImproperlyConfigured(
                "Twilio SMS provider requires either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID."
            )

    def send_sms(self, to_phone: str, message: str) -> SMSResult:
        masked = mask_phone_number(to_phone)
        try:
            from twilio.rest import Client
            from twilio.base.exceptions import TwilioRestException

            client = Client(self.account_sid, self.auth_token)
            kwargs = {"to": to_phone, "body": message}
            if self.messaging_service_sid:
                kwargs["messaging_service_sid"] = self.messaging_service_sid
            else:
                kwargs["from_"] = self.from_number

            msg = client.messages.create(**kwargs)
            logger.info("Twilio SMS dispatched to %s with SID %s", masked, msg.sid)
            return SMSResult(success=True, message_id=msg.sid)
        except ImportError:
            logger.error("Twilio package is not installed.")
            return SMSResult(success=False, error_message="Twilio SMS service unavailable.")
        except Exception as e:
            logger.error("Twilio SMS delivery failed for %s: %s", masked, type(e).__name__)
            return SMSResult(success=False, error_message="Failed to deliver SMS. Please try again later.")


class MSG91SMSProvider(BaseSMSProvider):
    """
    MSG91 SMS integration provider for transactional OTPs.
    """

    def __init__(self):
        self.auth_key = getattr(settings, "MSG91_AUTH_KEY", "").strip()
        self.sender_id = getattr(settings, "MSG91_SENDER_ID", "").strip()
        self.template_id = getattr(settings, "MSG91_TEMPLATE_ID", "").strip()

        if not self.auth_key:
            raise ImproperlyConfigured("MSG91 SMS provider requires MSG91_AUTH_KEY.")

    def send_sms(self, to_phone: str, message: str) -> SMSResult:
        masked = mask_phone_number(to_phone)
        try:
            import requests

            # Format phone number for MSG91 (requires country code without '+')
            clean_phone = to_phone.replace("+", "")
            url = "https://control.msg91.com/api/v5/flow/"
            headers = {
                "authkey": self.auth_key,
                "content-type": "application/json",
            }
            payload = {
                "template_id": self.template_id,
                "short_url": "0",
                "recipients": [
                    {
                        "mobiles": clean_phone,
                        "message": message,
                    }
                ],
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                logger.info("MSG91 SMS sent to %s", masked)
                return SMSResult(success=True, message_id=resp.text[:30])
            else:
                logger.error("MSG91 returned non-200 status code: %s", resp.status_code)
                return SMSResult(success=False, error_message="SMS delivery provider error.")
        except Exception as e:
            logger.error("MSG91 delivery failed for %s: %s", masked, type(e).__name__)
            return SMSResult(success=False, error_message="Failed to deliver SMS.")


def get_sms_provider() -> BaseSMSProvider:
    """
    Factory function returning the configured SMS provider instance.
    """
    provider_name = getattr(settings, "SMS_PROVIDER", "console" if settings.DEBUG else "dummy").lower()

    if provider_name == "dummy":
        return DummySMSProvider()
    elif provider_name == "console":
        return ConsoleSMSProvider()
    elif provider_name == "twilio":
        return TwilioSMSProvider()
    elif provider_name == "msg91":
        return MSG91SMSProvider()
    else:
        raise ImproperlyConfigured(f"Unknown or unsupported SMS_PROVIDER: '{provider_name}'")
