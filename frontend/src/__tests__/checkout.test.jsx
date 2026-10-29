import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CheckoutPage, resolveRazorpayAmountPaise } from '../pages/CheckoutPage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ordersApi } from '../api/orders';
import { couponsApi } from '../api/coupons';
import { paymentsApi } from '../api/payments';
import { cartApi } from '../api/cart';
import { authApi } from '../api/auth';

vi.mock('../api/orders', () => ({
  ordersApi: {
    checkout: vi.fn(),
  },
}));

vi.mock('../api/coupons', () => ({
  couponsApi: {
    applyCoupon: vi.fn(),
  },
}));

vi.mock('../api/payments', () => ({
  paymentsApi: {
    createPayment: vi.fn(),
    verifyRazorpayPayment: vi.fn(),
    getPaymentConfig: vi.fn(),
  },
}));


vi.mock('../api/cart', () => ({
  cartApi: {
    getCart: vi.fn(),
  },
}));

vi.mock('../api/auth', () => ({
  authApi: {
    getProfile: vi.fn(),
  },
}));

const mockCartData = {
  id: 10,
  total_items: 1,
  total_price: '500.00',
  cart_items: [
    {
      id: 1,
      quantity: 1,
      sub_total: '500.00',
      product: { id: 10, name: 'Item A', price: '500.00' },
    },
  ],
};

const renderCheckoutPage = () => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <CheckoutPage />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

describe('CheckoutPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'user@example.com' }));
    authApi.getProfile.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartApi.getCart.mockResolvedValue(mockCartData);
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: false,
      razorpay_key_id: '',
      cod_enabled: true,
      stripe_enabled: false,
    });
  });


  it('renders shipping form when cart has items', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm Shipping & Continue/i })).toBeInTheDocument();
    });
  });

  it('submits shipping address and advances to payment and coupon step', async () => {
    ordersApi.checkout.mockResolvedValue({
      id: 99,
      total_price: '500.00',
      status: 'PENDING',
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(ordersApi.checkout).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Order #99/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Choose Payment Method/i)).toBeInTheDocument();
      expect(screen.getByText(/Cash on Delivery \(COD\)/i)).toBeInTheDocument();
    });
  });

  it('applies coupon code to created order and updates payable total', async () => {
    ordersApi.checkout.mockResolvedValue({
      id: 99,
      total_price: '500.00',
      status: 'PENDING',
    });

    couponsApi.applyCoupon.mockResolvedValue({
      coupon: 'SAVE20',
      discount: '100.00',
      final_total: '400.00',
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    // Fill & submit
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter coupon code/i)).toBeInTheDocument();
    });

    // Enter coupon
    fireEvent.change(screen.getByPlaceholderText(/Enter coupon code/i), {
      target: { value: 'SAVE20' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));

    await waitFor(() => {
      expect(couponsApi.applyCoupon).toHaveBeenCalledWith(99, 'SAVE20');
      expect(screen.getByText(/Coupon “SAVE20” applied: -₹100.00 discount!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Place Order \(₹400.00\)/i })).toBeInTheDocument();
    });
  });

  it('displays error message when coupon is invalid or rejected', async () => {
    ordersApi.checkout.mockResolvedValue({
      id: 99,
      total_price: '500.00',
      status: 'PENDING',
    });

    couponsApi.applyCoupon.mockRejectedValue({
      response: {
        status: 400,
        data: ['Invalid coupon.'],
      },
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter coupon code/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Enter coupon code/i), {
      target: { value: 'INVALID99' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));

    await waitFor(() => {
      expect(couponsApi.applyCoupon).toHaveBeenCalledWith(99, 'INVALID99');
      expect(screen.getByText('Invalid coupon.')).toBeInTheDocument();
    });
  });

  it('handles order creation failure with server error message', async () => {
    ordersApi.checkout.mockRejectedValue({
      response: {
        status: 400,
        data: ['Item A has only 0 item(s) left.'],
      },
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Item A has only 0 item(s) left.')).toBeInTheDocument();
    });
  });

  it('completes order with COD payment and navigates to order confirmation', async () => {
    ordersApi.checkout.mockResolvedValue({
      id: 99,
      total_price: '500.00',
      status: 'PENDING',
    });
    paymentsApi.createPayment.mockResolvedValue({
      id: 55,
      order: 99,
      payment_method: 'COD',
      payment_status: 'PENDING',
      amount: '500.00',
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Place Order \(₹500.00\)/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Place Order \(₹500.00\)/i }));

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(99, 'COD');
    });
  });

  it('offers Razorpay option when configured and handles successful verification flow', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: true,
      razorpay_key_id: 'rzp_test_mockkey123',
      cod_enabled: true,
      stripe_enabled: false,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 99,
      total_price: '500.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 12,
      order_id: 99,
      razorpay_order_id: 'order_mock123',
      razorpay_key_id: 'rzp_test_mockkey123',
      amount: '500.00',
      amount_paise: 50000,
      currency: 'INR',
      customer: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        contact: '9876543210',
      },
    });

    paymentsApi.verifyRazorpayPayment.mockResolvedValue({
      detail: 'Payment verified successfully.',
      order_id: 99,
      status: 'SUCCESS',
      transaction_id: 'pay_mock789',
    });

    let capturedOptions;
    const mockOpen = vi.fn().mockImplementation(() => {
      capturedOptions.handler({
        razorpay_payment_id: 'pay_mock789',
        razorpay_order_id: 'order_mock123',
        razorpay_signature: 'sig_mock_valid',
      });
    });

    window.Razorpay = vi.fn().mockImplementation(function (opts) {
      capturedOptions = opts;
      this.open = mockOpen;
      this.on = vi.fn();
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Mode Active/i)).toBeInTheDocument();
    });

    // Select Razorpay
    fireEvent.click(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay with Razorpay \(₹500.00\)/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Pay with Razorpay \(₹500.00\)/i }));

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(99, 'RAZORPAY');
      expect(window.Razorpay).toHaveBeenCalledTimes(1);
      // Validates integer amount in paise and customer prefill
      expect(capturedOptions.amount).toBe(50000);
      expect(Number.isInteger(capturedOptions.amount)).toBe(true);
      expect(capturedOptions.currency).toBe('INR');
      expect(capturedOptions.prefill.name).toBe('Jane Doe');
      expect(capturedOptions.prefill.email).toBe('jane@example.com');
      expect(capturedOptions.prefill.contact).toBe('9876543210');
      expect(paymentsApi.verifyRazorpayPayment).toHaveBeenCalledWith({
        order_id: 99,
        razorpay_order_id: 'order_mock123',
        razorpay_payment_id: 'pay_mock789',
        razorpay_signature: 'sig_mock_valid',
      });
    });
  });

  it('correctly converts rupee amount "3009.69" to 300969 paise when amount_paise is absent', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: true,
      razorpay_key_id: 'rzp_test_mockkey123',
      cod_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 101,
      total_price: '3009.69',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 15,
      order_id: 101,
      razorpay_order_id: 'order_mock3009',
      razorpay_key_id: 'rzp_test_mockkey123',
      amount: '3009.69', // Rupee string fallback without amount_paise
      currency: 'INR',
      customer: {
        name: 'Bob Ross',
        email: 'bob@example.com',
        contact: '9123456789',
      },
    });

    let capturedOpts;
    window.Razorpay = vi.fn().mockImplementation(function (opts) {
      capturedOpts = opts;
      this.open = vi.fn();
      this.on = vi.fn();
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Bob Ross' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9123456789' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '456 Studio Way' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Delhi' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'DL' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '110001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Razorpay/i }));

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(101, 'RAZORPAY');
      expect(window.Razorpay).toHaveBeenCalledTimes(1);
      expect(capturedOpts.amount).toBe(300969);
      expect(Number.isInteger(capturedOpts.amount)).toBe(true);
      expect(capturedOpts.prefill.name).toBe('Bob Ross');
      expect(capturedOpts.prefill.email).toBe('bob@example.com');
      expect(capturedOpts.prefill.contact).toBe('9123456789');
    });
  });

  it('prevents Razorpay checkout initialization when payment amount is invalid or zero', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: true,
      razorpay_key_id: 'rzp_test_mockkey123',
      cod_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 102,
      total_price: '0.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 16,
      order_id: 102,
      razorpay_order_id: 'order_mock_zero',
      razorpay_key_id: 'rzp_test_mockkey123',
      amount: '0.00',
      amount_paise: 0,
      currency: 'INR',
    });

    window.Razorpay = vi.fn();

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Razorpay/i }));

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(102, 'RAZORPAY');
      expect(window.Razorpay).not.toHaveBeenCalled();
      expect(screen.getByText('Invalid payment amount received from server.')).toBeInTheDocument();
    });
  });

  it('handles Razorpay modal cancellation without marking order as paid', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: true,
      razorpay_key_id: 'rzp_test_mockkey123',
      cod_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 103,
      total_price: '500.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 17,
      order_id: 103,
      razorpay_order_id: 'order_mock103',
      razorpay_key_id: 'rzp_test_mockkey123',
      amount_paise: 50000,
      currency: 'INR',
    });

    let capturedDismissOpts;
    const mockDismissOpen = vi.fn().mockImplementation(() => {
      // Simulate user closing the checkout modal
      capturedDismissOpts.modal.ondismiss();
    });

    window.Razorpay = vi.fn().mockImplementation(function (opts) {
      capturedDismissOpts = opts;
      this.open = mockDismissOpen;
      this.on = vi.fn();
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Razorpay \(₹500.00\)/i }));

    await waitFor(() => {
      expect(window.Razorpay).toHaveBeenCalled();
      expect(paymentsApi.verifyRazorpayPayment).not.toHaveBeenCalled();
      expect(screen.getByText('Checkout window was closed. You can retry payment anytime.')).toBeInTheDocument();
    });
  });

  it('handles Razorpay signature verification failure and displays error toast', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: true,
      razorpay_key_id: 'rzp_test_mockkey123',
      cod_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 99,
      total_price: '500.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 12,
      order_id: 99,
      razorpay_order_id: 'order_mock123',
      razorpay_key_id: 'rzp_test_mockkey123',
      amount_paise: 50000,
      currency: 'INR',
    });

    paymentsApi.verifyRazorpayPayment.mockRejectedValue({
      response: {
        status: 400,
        data: { detail: 'Invalid payment signature.' },
      },
    });

    let capturedFailureOpts;
    const mockFailureOpen = vi.fn().mockImplementation(() => {
      capturedFailureOpts.handler({
        razorpay_payment_id: 'pay_mock789',
        razorpay_order_id: 'order_mock123',
        razorpay_signature: 'sig_mock_invalid',
      });
    });

    window.Razorpay = vi.fn().mockImplementation(function (opts) {
      capturedFailureOpts = opts;
      this.open = mockFailureOpen;
      this.on = vi.fn();
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Razorpay \(₹500.00\)/i }));

    await waitFor(() => {
      expect(paymentsApi.verifyRazorpayPayment).toHaveBeenCalled();
      expect(screen.getByText('Invalid payment signature.')).toBeInTheDocument();
    });
  });

  it('supports UPI payment flow (success@razorpay) and verifies signature', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: true,
      razorpay_key_id: 'rzp_test_mockkey123',
      cod_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 104,
      total_price: '500.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 20,
      order_id: 104,
      razorpay_order_id: 'order_upi_104',
      razorpay_key_id: 'rzp_test_mockkey123',
      amount_paise: 50000,
      currency: 'INR',
      customer: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        contact: '9876543210',
      },
    });

    paymentsApi.verifyRazorpayPayment.mockResolvedValue({
      detail: 'Payment verified successfully.',
      order_id: 104,
      status: 'SUCCESS',
      transaction_id: 'pay_upi_success_test',
    });

    let upiOptions;
    const mockUpiOpen = vi.fn().mockImplementation(() => {
      // Simulate Razorpay handler returning UPI payment ID
      upiOptions.handler({
        razorpay_payment_id: 'pay_upi_success_test',
        razorpay_order_id: 'order_upi_104',
        razorpay_signature: 'sig_upi_valid_hex',
      });
    });

    window.Razorpay = vi.fn().mockImplementation(function (opts) {
      upiOptions = opts;
      this.open = mockUpiOpen;
      this.on = vi.fn();
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Razorpay \(₹500.00\)/i }));

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(104, 'RAZORPAY');
      expect(window.Razorpay).toHaveBeenCalledTimes(1);
      expect(upiOptions.amount).toBe(50000);
      expect(upiOptions.currency).toBe('INR');
      expect(paymentsApi.verifyRazorpayPayment).toHaveBeenCalledWith({
        order_id: 104,
        razorpay_order_id: 'order_upi_104',
        razorpay_payment_id: 'pay_upi_success_test',
        razorpay_signature: 'sig_upi_valid_hex',
      });
    });
  });

  it('handles UPI simulation failure (failure@razorpay) via payment.failed without marking order paid', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: true,
      razorpay_key_id: 'rzp_test_mockkey123',
      cod_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 105,
      total_price: '500.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 21,
      order_id: 105,
      razorpay_order_id: 'order_upi_105',
      razorpay_key_id: 'rzp_test_mockkey123',
      amount_paise: 50000,
      currency: 'INR',
    });

    let eventHandlers = {};
    window.Razorpay = vi.fn().mockImplementation(function (opts) {
      this.open = vi.fn().mockImplementation(() => {
        // Trigger payment.failed (simulating failure@razorpay VPA response)
        if (eventHandlers['payment.failed']) {
          eventHandlers['payment.failed']({
            error: {
              code: 'BAD_REQUEST_ERROR',
              description: 'Payment failed at UPI gateway',
            },
          });
        }
      });
      this.on = vi.fn().mockImplementation((event, handler) => {
        eventHandlers[event] = handler;
      });
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Market St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'MH' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '400001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Razorpay \(Cards, UPI, NetBanking\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Razorpay \(₹500.00\)/i }));

    await waitFor(() => {
      expect(paymentsApi.verifyRazorpayPayment).not.toHaveBeenCalled();
      expect(screen.getByText('Payment failed at UPI gateway')).toBeInTheDocument();
    });
  });

  it('renders Stripe option when stripe_enabled is true in config', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: false,
      razorpay_key_id: '',
      cod_enabled: true,
      stripe_enabled: true,
      stripe_publishable_key: 'pk_test_123',
    });

    ordersApi.checkout.mockResolvedValue({
      id: 201,
      total_price: '500.00',
      status: 'PENDING',
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Stripe Way' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Bengaluru' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'KA' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '560001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Stripe \(Credit \/ Debit Card\)/i)).toBeInTheDocument();
    });
  });

  it('initiates Stripe session and redirects customer to session_url', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: false,
      razorpay_key_id: '',
      cod_enabled: true,
      stripe_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 202,
      total_price: '500.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockResolvedValue({
      payment_id: 88,
      order_id: 202,
      stripe_session_id: 'cs_test_mock_session_999',
      session_url: 'https://checkout.stripe.com/pay/cs_test_mock_session_999',
    });

    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Stripe Way' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Bengaluru' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'KA' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '560001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Stripe \(Credit \/ Debit Card\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Stripe \(Credit \/ Debit Card\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Stripe/i }));

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(202, 'STRIPE');
      expect(window.location.href).toBe('https://checkout.stripe.com/pay/cs_test_mock_session_999');
    });
  });

  it('handles Stripe payment initiation failure gracefully', async () => {
    paymentsApi.getPaymentConfig.mockResolvedValue({
      razorpay_enabled: false,
      razorpay_key_id: '',
      cod_enabled: true,
      stripe_enabled: true,
    });

    ordersApi.checkout.mockResolvedValue({
      id: 203,
      total_price: '500.00',
      status: 'PENDING',
    });

    paymentsApi.createPayment.mockRejectedValue({
      response: { data: { detail: 'Stripe gateway currently unavailable' } },
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('1. Delivery Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '123 Stripe Way' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Bengaluru' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'KA' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '560001' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Shipping & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Stripe \(Credit \/ Debit Card\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Stripe \(Credit \/ Debit Card\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Pay with Stripe/i }));

    await waitFor(() => {
      expect(screen.getByText('Stripe gateway currently unavailable')).toBeInTheDocument();
    });
  });
});

describe('resolveRazorpayAmountPaise utility', () => {
  it('prefers the authoritative amount_paise when available as integer', () => {
    expect(resolveRazorpayAmountPaise({ amount_paise: 50000, amount: '500.00' })).toBe(50000);
    expect(resolveRazorpayAmountPaise({ amount_paise: 300969, amount: '3009.69' })).toBe(300969);
  });

  it('safely converts a formatted rupee string like "3009.69" to 300969 paise if fallback is needed', () => {
    expect(resolveRazorpayAmountPaise({ amount: '3009.69' })).toBe(300969);
    expect(resolveRazorpayAmountPaise({ amount: '500.00' })).toBe(50000);
    expect(resolveRazorpayAmountPaise({ amount: '499.5' })).toBe(49950);
    expect(resolveRazorpayAmountPaise({ amount: '12' })).toBe(1200);
  });

  it('returns null for missing, non-positive, or invalid amounts', () => {
    expect(resolveRazorpayAmountPaise(null)).toBeNull();
    expect(resolveRazorpayAmountPaise({})).toBeNull();
    expect(resolveRazorpayAmountPaise({ amount: '0' })).toBeNull();
    expect(resolveRazorpayAmountPaise({ amount: '-500' })).toBeNull();
    expect(resolveRazorpayAmountPaise({ amount: 'invalid' })).toBeNull();
    expect(resolveRazorpayAmountPaise({ amount_paise: 0 })).toBeNull();
    expect(resolveRazorpayAmountPaise({ amount_paise: -100 })).toBeNull();
  });
});


