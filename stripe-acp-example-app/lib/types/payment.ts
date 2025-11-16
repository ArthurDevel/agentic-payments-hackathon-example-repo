/**
 * Payment type definitions for Stripe integration
 */

/**
 * Request to create PaymentIntent
 */
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
}

/**
 * PaymentIntent response
 */
export interface CreatePaymentIntentResponse {
  client_secret: string;
}

/**
 * Payment data for completing checkout
 */
export interface PaymentData {
  token: string;
  provider: 'stripe';
}

/**
 * Request to complete checkout with PaymentIntent
 */
export interface CompleteCheckoutRequest {
  payment_data: PaymentData;
}
