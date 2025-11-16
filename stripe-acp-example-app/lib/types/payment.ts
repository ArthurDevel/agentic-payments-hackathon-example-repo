/**
 * Payment type definitions for Stripe integration
 */

/**
 * Request to create SharedPaymentToken
 */
export interface CreateSPTRequest {
  payment_method_id: string;
  amount: number;
  currency: string;
  checkout_id: string;
}

/**
 * SharedPaymentToken response
 */
export interface CreateSPTResponse {
  spt_token: string;
}

/**
 * Request to complete checkout with SPT
 */
export interface CompleteCheckoutRequest {
  spt_token: string;
}
