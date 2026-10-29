import socket
import ssl
import smtplib
from datetime import datetime
from email.utils import parseaddr

from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.core.mail import get_connection, EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone


class Command(BaseCommand):
    help = (
        "Safely verifies the configured SMTP email settings, tests connectivity/authentication, "
        "and optionally dispatches a diagnostic test email to an explicitly specified recipient."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "-r", "--recipient",
            dest="recipient",
            type=str,
            help="Email address of the recipient for the test message.",
        )
        parser.add_argument(
            "positional_recipient",
            nargs="?",
            type=str,
            default=None,
            help="Alternative positional recipient email address.",
        )
        parser.add_argument(
            "--probe-only",
            action="store_true",
            help="Probe the SMTP connection and credentials without actually dispatching a test email.",
        )

    def handle(self, *args, **options):
        recipient = (options.get("recipient") or options.get("positional_recipient") or "").strip()
        probe_only = options.get("probe_only", False)

        self.stdout.write(self.style.MIGRATE_HEADING("=== DjangoMart SMTP Diagnostic Probe ==="))

        # 1. Inspect and display safe configuration
        backend = getattr(settings, "EMAIL_BACKEND", "")
        host = getattr(settings, "EMAIL_HOST", "")
        port = getattr(settings, "EMAIL_PORT", "")
        use_tls = getattr(settings, "EMAIL_USE_TLS", False)
        use_ssl = getattr(settings, "EMAIL_USE_SSL", False)
        timeout = getattr(settings, "EMAIL_TIMEOUT", 25)
        host_user = getattr(settings, "EMAIL_HOST_USER", "")
        host_password = getattr(settings, "EMAIL_HOST_PASSWORD", "")
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")

        password_status = (
            f"Configured (length: {len(host_password)} chars)"
            if host_password
            else "NOT CONFIGURED"
        )

        self.stdout.write(f"EMAIL_BACKEND:       {backend}")
        self.stdout.write(f"EMAIL_HOST:          {host}")
        self.stdout.write(f"EMAIL_PORT:          {port}")
        self.stdout.write(f"EMAIL_USE_TLS:       {use_tls}")
        self.stdout.write(f"EMAIL_USE_SSL:       {use_ssl}")
        self.stdout.write(f"EMAIL_TIMEOUT:       {timeout}s")
        self.stdout.write(f"EMAIL_HOST_USER:     {host_user if host_user else '(none)'}")
        self.stdout.write(f"EMAIL_HOST_PASSWORD: {password_status}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL:  {from_email}")
        self.stdout.write("-" * 45)

        # 2. Basic Configuration Validation
        if "smtp" in backend.lower() and not host_password:
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: EMAIL_HOST_PASSWORD is empty. SMTP authentication may fail if your provider requires credentials."
                )
            )

        if use_tls and use_ssl:
            raise CommandError("Invalid configuration: EMAIL_USE_TLS and EMAIL_USE_SSL cannot both be True.")

        # 3. Connection & Authentication Probe
        self.stdout.write("Testing low-level SMTP connection and authentication...")
        try:
            connection = get_connection(
                backend=backend,
                fail_silently=False,
            )
            connection.open()
            self.stdout.write(self.style.SUCCESS("[SUCCESS] SMTP handshake and authentication succeeded!"))
        except smtplib.SMTPAuthenticationError as exc:
            self.stdout.write(self.style.ERROR(f"[FAIL] SMTP Authentication Error: {exc}"))
            self.stdout.write(
                self.style.WARNING(
                    "Hint: For Gmail, ensure you are using a 16-character App Password (not your account password), "
                    "with 2-Step Verification enabled on the Google Account."
                )
            )
            return
        except (smtplib.SMTPConnectError, socket.error, ConnectionRefusedError) as exc:
            self.stdout.write(self.style.ERROR(f"[FAIL] SMTP Connection Error: {exc}"))
            self.stdout.write(
                self.style.WARNING(
                    f"Hint: Check if firewall, ISP, or antivirus blocks outbound connections to {host}:{port}."
                )
            )
            return
        except ssl.SSLError as exc:
            self.stdout.write(self.style.ERROR(f"[FAIL] SSL/TLS Error: {exc}"))
            return
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"[FAIL] Unexpected connection error: {type(exc).__name__}: {exc}"))
            return
        finally:
            try:
                connection.close()
            except Exception:
                pass

        if probe_only:
            self.stdout.write(self.style.SUCCESS("Probe completed successfully. No test email was sent (--probe-only)."))
            return

        # 4. Email Sending Probe
        if not recipient:
            self.stdout.write(
                self.style.WARNING(
                    "\nNo recipient specified. To dispatch a test email, run:\n"
                    "  python manage.py test_smtp_email --recipient you@example.com"
                )
            )
            return

        try:
            validate_email(recipient)
        except ValidationError:
            raise CommandError(f"Invalid recipient email address: '{recipient}'")

        self.stdout.write(f"\nDispatching diagnostic test email to: {recipient}...")

        timestamp_str = timezone.now().strftime("%Y-%m-%d %H:%M:%S %Z")
        subject = f"DjangoMart - SMTP Diagnostic Test ({timezone.now().strftime('%H:%M:%S')})"

        html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>DjangoMart SMTP Test</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #18181b;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <tr>
            <td style="padding: 24px 32px; background-color: #000000; text-align: center;">
                <span style="font-size: 20px; font-weight: 800; color: #ffffff;">DjangoMart</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <h2 style="font-size: 18px; font-weight: 700; color: #16a34a; margin: 0 0 16px 0;">&#10003; SMTP Delivery Test Succeeded</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 20px 0;">
                    This is an automated diagnostic test message generated by DjangoMart to verify outbound email delivery through your configured SMTP server.
                </p>
                <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6;">
                    <div><strong>Host:</strong> {host}:{port}</div>
                    <div><strong>Encryption:</strong> {"TLS" if use_tls else ("SSL" if use_ssl else "Plain")}</div>
                    <div><strong>Sender:</strong> {from_email}</div>
                    <div><strong>Recipient:</strong> {recipient}</div>
                    <div><strong>Timestamp:</strong> {timestamp_str}</div>
                </div>
                <p style="font-size: 13px; line-height: 1.5; color: #71717a; margin: 0;">
                    If you received this message, your Django email configuration is completely operational.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 16px 32px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
                <p style="font-size: 12px; color: #a1a1aa; margin: 0;">&copy; DjangoMart E-Commerce Platform</p>
            </td>
        </tr>
    </table>
</body>
</html>"""

        plain_text = (
            f"DjangoMart - SMTP Diagnostic Test\n\n"
            f"This is an automated test message from DjangoMart.\n"
            f"If you received this message, your outbound SMTP configuration is operational.\n\n"
            f"Host: {host}:{port}\n"
            f"Sender: {from_email}\n"
            f"Recipient: {recipient}\n"
            f"Timestamp: {timestamp_str}\n\n"
            f"- The DjangoMart System"
        )

        _, reply_addr = parseaddr(from_email)
        clean_reply_to = [reply_addr] if reply_addr else [from_email]

        try:
            email_msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_email,
                to=[recipient],
                reply_to=clean_reply_to,
                connection=connection,
            )
            email_msg.attach_alternative(html_body, "text/html")
            send_count = email_msg.send(fail_silently=False)

            if send_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\n[SUCCESS] Test email successfully submitted to SMTP server for '{recipient}'!"
                    )
                )
                self.stdout.write(
                    self.style.MIGRATE_LABEL(
                        "Please check the recipient's Inbox, Spam, and Promotions folders to confirm mailbox delivery."
                    )
                )
            else:
                self.stdout.write(self.style.WARNING("[WARNING] Email backend returned 0 messages sent."))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"\n[FAIL] Failed to dispatch test email: {type(exc).__name__}: {exc}"))
