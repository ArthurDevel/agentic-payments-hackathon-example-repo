/**
 * API Route: Create SharedPaymentToken (Delegated Payment Spec)
 *
 * Responsibilities:
 * - Receives PaymentMethod ID from frontend
 * - Creates SharedPaymentToken via Stripe API
 * - Returns SPT token to frontend (which passes it to agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CreateSPTRequest, CreateSPTResponse } from '@/lib/types/payment';
import { CheckoutSession } from '@/lib/types/checkout';

const SESSIONS_FILE_PATH = path.join(
  process.cwd(),
  'conversations',
  'checkout_sessions.json'
);

function readSessionsFromFile(): Map<string, CheckoutSession> {
  try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
      const fileContent = fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8');
      if (fileContent) {
        const data = JSON.parse(fileContent);
        return new Map(data);
      }
    }
  } catch (error) {
    console.error('Error reading checkout sessions file:', error);
  }
  return new Map<string, CheckoutSession>();
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SPT_EXPIRY_MINUTES = 30; // SPT expires in 30 minutes

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * POST handler to create SharedPaymentToken
 * @param request - Next.js request object with PaymentMethod ID and checkout details
 * @returns JSON response with SPT token
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateSPTResponse>> {
  const body: CreateSPTRequest = await request.json();

  if (!body.payment_method_id) {
    throw new Error('payment_method_id is required');
  }

  if (!body.checkout_id) {
    throw new Error('checkout_id is required');
  }

  if (!body.amount || body.amount <= 0) {
    throw new Error('Valid amount is required');
  }

  if (!body.currency) {
    throw new Error('currency is required');
  }

  // Verify checkout exists and amount matches
  const checkoutSessions = readSessionsFromFile();
  const checkout = checkoutSessions.get(body.checkout_id);
  if (!checkout) {
    throw new Error(`Checkout session not found: ${body.checkout_id}`);
  }

  const checkoutTotal = checkout.totals.find((t) => t.label === 'Total')?.amount;
  if (checkoutTotal !== body.amount) {
    throw new Error(`Amount mismatch. Expected ${checkoutTotal}, got ${body.amount}`);
  }

  // Calculate expiry timestamp
  const expiresAt = Math.floor(Date.now() / 1000) + SPT_EXPIRY_MINUTES * 60;

  // Create SharedPaymentToken via Stripe API
  // Using raw fetch since SharedPayment API may not be in SDK yet
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }

  const sptResponse = await fetch('https://api.stripe.com/v1/shared_payment/issued_tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method': body.payment_method_id,
      'usage_limits[currency]': body.currency,
      'usage_limits[max_amount]': body.amount.toString(),
      'usage_limits[expires_at]': expiresAt.toString(),
    }),
  });

  if (!sptResponse.ok) {
    const errorText = await sptResponse.text();
    throw new Error(`Stripe SPT creation failed: ${errorText}`);
  }

  const sptData = await sptResponse.json();

  return NextResponse.json({
    spt_token: sptData.id,
  });
}
