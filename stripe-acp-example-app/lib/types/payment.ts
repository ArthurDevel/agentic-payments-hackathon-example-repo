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
interface PaymentData {
  token: string; // This will be the payment_intent_id
  provider: 'stripe';
}

/**
 * Request to complete checkout with PaymentIntent
 */
export interface CompleteCheckoutRequest {
  payment_data: PaymentData;
}
