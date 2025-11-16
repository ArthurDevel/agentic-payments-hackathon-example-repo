/**
 * Checkout Session type definitions for ACP Agentic Checkout Spec
 */

/**
 * Buyer information
 */
export interface Buyer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

/**
 * Fulfillment address
 */
export interface FulfillmentAddress {
  name: string;
  line_one: string;
  line_two?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

/**
 * Item in cart
 */
export interface CartItem {
  id: string;
  quantity: number;
}

/**
 * Line item in checkout
 */
export interface LineItem {
  id: string;
  item: CartItem;
  base_amount: number;
  discount: number;
  total: number;
  subtotal: number;
  tax: number;
}

/**
 * Fulfillment option (shipping method)
 */
export interface FulfillmentOption {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

/**
 * Total line item
 */
export interface TotalItem {
  label: string;
  amount: number;
}

/**
 * Payment provider configuration
 */
export interface PaymentProvider {
  provider: string;
  supported_payment_methods: string[];
}

/**
 * Checkout session status
 */
export type CheckoutStatus =
  | 'not_ready_for_payment'
  | 'ready_for_payment'
  | 'completed'
  | 'canceled'
  | 'in_progress';

/**
 * Checkout session
 */
export interface CheckoutSession {
  id: string;
  buyer?: Buyer;
  payment_provider?: PaymentProvider;
  status: CheckoutStatus;
  currency: string;
  line_items: LineItem[];
  fulfillment_address?: FulfillmentAddress;
  fulfillment_options: FulfillmentOption[];
  fulfillment_option_id?: string;
  totals: TotalItem[];
  messages: string[];
  links: string[];
}

/**
 * Request to create checkout session
 */
export interface CreateCheckoutRequest {
  items: CartItem[];
  buyer?: Buyer;
  fulfillment_address?: FulfillmentAddress;
}

/**
 * Request to update checkout session
 */
export interface UpdateCheckoutRequest {
  buyer?: Buyer;
  fulfillment_address?: FulfillmentAddress;
  fulfillment_option_id?: string;
}
