import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CheckoutPage } from '../pages/CheckoutPage';
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
      amount: 50000,
      currency: 'INR',
      customer_name: 'Jane Doe',
      customer_email: 'jane@example.com',
      customer_phone: '9876543210',
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
      expect(paymentsApi.verifyRazorpayPayment).toHaveBeenCalledWith({
        order_id: 99,
        razorpay_order_id: 'order_mock123',
        razorpay_payment_id: 'pay_mock789',
        razorpay_signature: 'sig_mock_valid',
      });
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
      amount: 50000,
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
});

