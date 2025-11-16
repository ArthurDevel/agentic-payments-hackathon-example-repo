/**
 * API Route: Complete Checkout Session (ACP Agentic Checkout Spec)
 *
 * Responsibilities:
 * - Accepts SharedPaymentToken from agent
 * - Creates PaymentIntent with Stripe using SPT
 * - Creates order after successful payment
 * - Returns completed checkout and order details
 */

import { NextRequest, NextResponse } from 'next/server';
import { CompleteCheckoutRequest } from '@/lib/types/payment';
import { CompleteCheckoutResponse, Order } from '@/lib/types/order';
import { readSessionsFromFile, writeSessionsToFile } from '@/lib/checkout/sessionStorage';
import { stripe } from '@/lib/stripe/client';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a unique order ID
 * @returns Order ID string
 */
function generateOrderId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates an order after successful payment
 * @param checkoutId - Checkout session ID
 * @param paymentIntentId - Stripe PaymentIntent ID
 * @param amount - Total amount in cents
 * @param currency - Currency code
 * @returns Order object
 */
function createOrder(
  checkoutId: string,
  paymentIntentId: string,
  amount: number,
  currency: string
): Order {
  return {
    id: generateOrderId(),
    checkout_id: checkoutId,
    payment_intent_id: paymentIntentId,
    status: 'completed',
    total_amount: amount,
    currency,
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * POST handler to complete checkout with SharedPaymentToken
 * @param request - Next.js request object with SPT token
 * @param params - Route parameters containing checkout ID
 * @returns JSON response with completed checkout and order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CompleteCheckoutResponse>> {
  const { id } = await params;
  const body: CompleteCheckoutRequest = await request.json();

  if (!body.payment_data?.token) {
    throw new Error('payment_data.token (containing payment_intent_id) is required');
  }
  const paymentIntentId = body.payment_data.token;

  const checkoutSessions = readSessionsFromFile();
  const checkout = checkoutSessions.get(id);
  if (!checkout) {
    throw new Error(`Checkout session not found: ${id}`);
  }

  if (checkout.status !== 'ready_for_payment') {
    const missingItems: string[] = [];
    if (!checkout.fulfillment_address) {
      missingItems.push('shipping address');
    }
    if (!checkout.fulfillment_option_id) {
      missingItems.push('shipping option');
    }
    const missingText = missingItems.length > 0 
      ? ` Missing: ${missingItems.join(' and ')}.`
      : '';
    throw new Error(`Checkout not ready for payment. Status: ${checkout.status}.${missingText} Please update the checkout with address and shipping option first.`);
  }

  const totalAmount = checkout.totals.find((t) => t.label === 'Total')?.amount;
  if (!totalAmount) {
    throw new Error('Total amount not found in checkout');
  }

  // Retrieve and verify the PaymentIntent
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Payment failed with status: ${paymentIntent.status}`);
  }

  if (paymentIntent.amount !== totalAmount) {
    throw new Error(`Payment amount mismatch. Expected ${totalAmount}, but was ${paymentIntent.amount}`);
  }

  if (paymentIntent.currency !== checkout.currency) {
    throw new Error(`Payment currency mismatch. Expected ${checkout.currency}, but was ${paymentIntent.currency}`);
  }


  // Create order
  const order = createOrder(id, paymentIntent.id, totalAmount, checkout.currency);

  // Update checkout status
  checkout.status = 'completed';
  checkoutSessions.set(id, checkout);
  writeSessionsToFile(checkoutSessions);

  return NextResponse.json({
    checkout,
    order,
  });
}
