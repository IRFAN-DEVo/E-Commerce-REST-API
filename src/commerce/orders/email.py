import logging
from email.utils import parseaddr

from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def _get_from_email():
    return getattr(settings, "DEFAULT_FROM_EMAIL", "DjangoMart <noreply@djangomart.com>")


def _get_clean_reply_to(from_email: str):
    _, reply_addr = parseaddr(from_email)
    return [reply_addr] if reply_addr else [from_email]


def _get_frontend_url():
    return getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")


def send_order_confirmation_email(*, order, payment=None):
    """
    Sends an order confirmation email to the customer.
    Clearly distinguishes between Cash on Delivery (payment pending upon arrival)
    and paid online transactions (Razorpay / Stripe).
    """
    user = getattr(order, "user", None)
    if not user or not user.email:
        logger.warning("Cannot send confirmation email for order %s: missing user email.", order.id)
        return False

    cache_key = f"order_confirmation_email_sent_{order.id}"
    if cache.get(cache_key):
        logger.info("Order confirmation email already sent for order %s, skipping duplicate.", order.id)
        return False

    shipping = getattr(order, "shipping_address", None)
    customer_name = (
        (shipping.full_name if shipping else "")
        or user.get_full_name()
        or user.username
        or "Customer"
    )

    # Determine payment presentation
    payment_method_code = payment.payment_method if payment else "COD"
    payment_status_code = payment.payment_status if payment else "PENDING"
    transaction_id = getattr(payment, "transaction_id", "") if payment else ""

    if payment_method_code == "COD":
        payment_method_display = "Cash on Delivery (COD)"
        payment_status_display = "Pending (Payment due upon physical delivery)"
        is_paid = False
    elif payment_method_code == "RAZORPAY":
        payment_method_display = "Razorpay (Online Payment)"
        payment_status_display = "Paid" if payment_status_code == "SUCCESS" else payment_status_code.title()
        is_paid = (payment_status_code == "SUCCESS")
    elif payment_method_code == "STRIPE":
        payment_method_display = "Stripe (Card Payment)"
        payment_status_display = "Paid" if payment_status_code == "SUCCESS" else payment_status_code.title()
        is_paid = (payment_status_code == "SUCCESS")
    else:
        payment_method_display = payment_method_code
        payment_status_display = payment_status_code.title()
        is_paid = (payment_status_code == "SUCCESS")

    subject_status = "Paid" if is_paid else "Order Received"
    subject = f"DjangoMart - Order #{order.id} Confirmation [{subject_status}]"

    # Compile order items
    items = list(order.items.select_related("product").all())
    items_html_rows = []
    items_text_rows = []

    for item in items:
        p_name = item.product.name if item.product else "Product"
        items_html_rows.append(
            f"""<tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; color: #18181b;">
                    <strong>{p_name}</strong><br>
                    <span style="font-size: 12px; color: #71717a;">Qty: {item.quantity} &times; &#8377;{item.price:,.2f}</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; font-weight: 600; text-align: right; color: #18181b;">
                    &#8377;{item.sub_total:,.2f}
                </td>
            </tr>"""
        )
        items_text_rows.append(
            f"- {p_name} | Qty: {item.quantity} x Rs.{item.price:,.2f} = Rs.{item.sub_total:,.2f}"
        )

    items_html = "".join(items_html_rows)
    items_text = "\n".join(items_text_rows)

    # Shipping block
    if shipping:
        shipping_html = f"""
            <p style="font-size: 13px; line-height: 1.6; color: #52525b; margin: 0;">
                <strong>{shipping.full_name}</strong><br>
                {shipping.address}<br>
                {shipping.city}, {shipping.state} - {shipping.postal_code}<br>
                {shipping.country}<br>
                Phone: {shipping.phone}
            </p>
        """
        shipping_text = (
            f"{shipping.full_name}\n"
            f"{shipping.address}\n"
            f"{shipping.city}, {shipping.state} - {shipping.postal_code}\n"
            f"{shipping.country}\n"
            f"Phone: {shipping.phone}"
        )
    else:
        shipping_html = "<p style='font-size: 13px; color: #71717a;'>No shipping address provided.</p>"
        shipping_text = "No shipping address provided."

    tx_html = f"<div><strong>Transaction ID:</strong> {transaction_id}</div>" if transaction_id else ""
    tx_text = f"Transaction ID: {transaction_id}\n" if transaction_id else ""

    frontend_url = _get_frontend_url()
    view_order_url = f"{frontend_url}/orders/{order.id}"

    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order #{order.id} Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #18181b;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <tr>
            <td style="padding: 28px 36px; background-color: #000000; text-align: center;">
                <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">DjangoMart</span>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 36px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 12px 0;">Order Confirmed!</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px 0;">
                    Hello {customer_name},<br>
                    Thank you for shopping with us. Your order <strong>#{order.id}</strong> has been successfully placed.
                </p>

                <!-- Status Summary Box -->
                <div style="background-color: #f8fafc; border: 1px solid #e4e4e7; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #52525b;">
                        <span>Payment Method:</span>
                        <strong style="color: #18181b;">{payment_method_display}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #52525b;">
                        <span>Payment Status:</span>
                        <strong style="color: {'#16a34a' if is_paid else '#d97706'};">{payment_status_display}</strong>
                    </div>
                    {tx_html}
                </div>

                <!-- Items Table -->
                <h3 style="font-size: 15px; font-weight: 700; color: #18181b; margin: 0 0 12px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Order Summary</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    {items_html}
                    <tr>
                        <td style="padding: 16px 0; font-size: 15px; font-weight: 700; color: #18181b;">Total Amount</td>
                        <td style="padding: 16px 0; font-size: 15px; font-weight: 700; text-align: right; color: #18181b;">&#8377;{order.total_price:,.2f}</td>
                    </tr>
                </table>

                <!-- Shipping Details -->
                <h3 style="font-size: 15px; font-weight: 700; color: #18181b; margin: 0 0 12px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Shipping Address</h3>
                <div style="margin-bottom: 32px;">
                    {shipping_html}
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="{view_order_url}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">View Order Status</a>
                </div>

                <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 32px 0 20px 0;">

                <p style="font-size: 12px; line-height: 1.5; color: #a1a1aa; margin: 0;">
                    Need help with your order? Reach out anytime at <a href="mailto:support@djangomart.com" style="color: #000000; text-decoration: underline;">support@djangomart.com</a>.
                </p>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td style="padding: 20px 36px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
                <p style="font-size: 12px; color: #a1a1aa; margin: 0;">&copy; DjangoMart E-Commerce Platform. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>"""

    text_message = (
        f"DjangoMart - Order #{order.id} Confirmation [{subject_status}]\n\n"
        f"Hello {customer_name},\n\n"
        f"Thank you for your order! Your order #{order.id} has been placed successfully.\n\n"
        f"Payment Method: {payment_method_display}\n"
        f"Payment Status: {payment_status_display}\n"
        f"{tx_text}\n"
        f"Items:\n"
        f"{items_text}\n\n"
        f"Total: Rs.{order.total_price:,.2f}\n\n"
        f"Shipping Address:\n"
        f"{shipping_text}\n\n"
        f"View your order: {view_order_url}\n\n"
        f"Support: support@djangomart.com\n\n"
        f"- The DjangoMart Team"
    )

    from_email = _get_from_email()
    clean_reply_to = _get_clean_reply_to(from_email)

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=from_email,
            to=[user.email],
            reply_to=clean_reply_to,
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        cache.set(cache_key, True, timeout=86400 * 7)
        logger.info("Order confirmation email successfully sent for order %s to %s", order.id, user.email)
        return True
    except Exception as exc:
        logger.warning("Failed to send order confirmation email for order %s: %s", order.id, exc)
        return False


def send_order_cancellation_email(*, order, reason=""):
    """
    Sends an order cancellation notification email to the customer.
    Informs customer that order #{order.id} has been cancelled, reserved inventory has
    been restored, and communicates the authoritative refund state.
    """
    user = getattr(order, "user", None)
    if not user or not user.email:
        logger.warning("Cannot send cancellation email for order %s: missing user email.", order.id)
        return False

    cache_key = f"order_cancellation_email_sent_{order.id}"
    if cache.get(cache_key):
        logger.info("Order cancellation email already sent for order %s, skipping duplicate.", order.id)
        return False

    shipping = getattr(order, "shipping_address", None)
    customer_name = (
        (shipping.full_name if shipping else "")
        or user.get_full_name()
        or user.username
        or "Customer"
    )

    subject = f"DjangoMart - Order #{order.id} Has Been Cancelled"

    payment = getattr(order, "payment", None)
    refund_status = getattr(payment, "refund_status", "NOT_APPLICABLE") if payment else "NOT_APPLICABLE"
    refund_amount = getattr(payment, "refund_amount", None) or getattr(order, "total_price", 0)

    if refund_status == "COMPLETED":
        refund_line_html = f"<strong>Refund Confirmed:</strong> A full refund of &#8377;{refund_amount:,.2f} has been completed to your original payment method."
        refund_line_text = f"Refund Confirmed: A full refund of Rs.{refund_amount:,.2f} has been completed to your original payment method."
    elif refund_status in ("PROCESSING", "PENDING"):
        refund_line_html = f"<strong>Refund Initiated:</strong> A refund of &#8377;{refund_amount:,.2f} has been initiated and is currently processing with your payment provider."
        refund_line_text = f"Refund Initiated: A refund of Rs.{refund_amount:,.2f} has been initiated and is currently processing with your payment provider."
    elif refund_status == "MANUAL_PROCESSING_REQUIRED":
        refund_line_html = f"<strong>Refund Queued:</strong> Your refund request of &#8377;{refund_amount:,.2f} has been logged and is currently being processed by our billing team."
        refund_line_text = f"Refund Queued: Your refund request of Rs.{refund_amount:,.2f} has been logged and is currently being processed by our billing team."
    elif refund_status == "FAILED":
        refund_line_html = "<strong>Refund Notice:</strong> Automated refund initiation encountered a delay; our billing team is reviewing it."
        refund_line_text = "Refund Notice: Automated refund initiation encountered a delay; our billing team is reviewing it."
    else:
        refund_line_html = "No payment charge was captured for this order."
        refund_line_text = "No payment charge was captured for this order."

    items = list(order.items.select_related("product").all())
    items_html_rows = []
    items_text_rows = []

    for item in items:
        p_name = item.product.name if item.product else "Product"
        items_html_rows.append(
            f"""<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5; font-size: 13px; color: #52525b;">
                    {p_name} &times; {item.quantity}
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5; font-size: 13px; text-align: right; color: #52525b;">
                    &#8377;{item.sub_total:,.2f}
                </td>
            </tr>"""
        )
        items_text_rows.append(f"- {p_name} x {item.quantity} (Rs.{item.sub_total:,.2f})")

    items_html = "".join(items_html_rows)
    items_text = "\n".join(items_text_rows)

    reason_html = f"<p style='font-size: 13px; color: #71717a;'><strong>Reason:</strong> {reason}</p>" if reason else ""
    reason_text = f"Reason: {reason}\n" if reason else ""

    frontend_url = _get_frontend_url()
    shop_url = f"{frontend_url}/shop"

    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order #{order.id} Cancelled</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #18181b;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <tr>
            <td style="padding: 24px 32px; background-color: #000000; text-align: center;">
                <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">DjangoMart</span>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 32px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #dc2626; margin: 0 0 12px 0;">Order Cancelled</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 20px 0;">
                    Hello {customer_name},<br>
                    Your order <strong>#{order.id}</strong> has been cancelled as requested.
                </p>

                {reason_html}

                <!-- Notice Card -->
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; line-height: 1.6; color: #991b1b;">
                    <div>All reserved inventory has been returned to stock, and any applied promo coupons have been released back to your account.</div>
                    <div style="margin-top: 8px; font-weight: 500;">{refund_line_html}</div>
                </div>

                <!-- Cancelled Items Summary -->
                <h3 style="font-size: 14px; font-weight: 700; color: #000000; margin: 20px 0 8px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">Cancelled Items</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                    {items_html}
                    <tr>
                        <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #000000;">Total Cancelled Amount</td>
                        <td style="padding: 12px 0; font-size: 14px; font-weight: 700; text-align: right; color: #000000;">&#8377;{order.total_price:,.2f}</td>
                    </tr>
                </table>

                <div style="text-align: center; margin: 28px 0 16px 0;">
                    <a href="{shop_url}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">Continue Shopping</a>
                </div>

                <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 24px 0 16px 0;">

                <p style="font-size: 12px; line-height: 1.5; color: #a1a1aa; margin: 0;">
                    If you did not request this cancellation or believe this was done in error, please contact our support team immediately at <a href="mailto:support@djangomart.com" style="color: #000000; text-decoration: underline;">support@djangomart.com</a>.
                </p>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td style="padding: 16px 32px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
                <p style="font-size: 12px; color: #a1a1aa; margin: 0;">&copy; DjangoMart E-Commerce Platform. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>"""

    text_message = (
        f"DjangoMart - Order #{order.id} Cancelled\n\n"
        f"Hello {customer_name},\n\n"
        f"Your order #{order.id} has been cancelled.\n\n"
        f"{reason_text}"
        f"Any reserved stock has been returned and applied coupons have been restored.\n"
        f"{refund_line_text}\n\n"
        f"Cancelled Items:\n"
        f"{items_text}\n\n"
        f"Total: Rs.{order.total_price:,.2f}\n\n"
        f"Continue shopping: {shop_url}\n\n"
        f"Questions? Contact support@djangomart.com\n\n"
        f"- The DjangoMart Team"
    )

    from_email = _get_from_email()
    clean_reply_to = _get_clean_reply_to(from_email)

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=from_email,
            to=[user.email],
            reply_to=clean_reply_to,
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        cache.set(cache_key, True, timeout=86400 * 7)
        logger.info("Order cancellation email successfully sent for order %s to %s", order.id, user.email)
        return True
    except Exception as exc:
        logger.warning("Failed to send order cancellation email for order %s: %s", order.id, exc)
        return False
