/**
 * Order type definitions
 */

import { CheckoutSession } from './checkout';

/**
 * Order confirmation after successful payment
 */
export interface Order {
  id: string;
  checkout_id: string;
  payment_intent_id: string;
  status: 'completed';
  total_amount: number;
  currency: string;
  created_at: string;
}

/**
 * Complete checkout response with order
 */
export interface CompleteCheckoutResponse {
  checkout: CheckoutSession;
  order: Order;
}
