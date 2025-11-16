/**
 * API Route: Create Payment Intent
 *
 * Responsibilities:
 * - Receives amount and currency from frontend
 * - Creates a PaymentIntent with Stripe
 * - Returns client_secret to the frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';

export async function POST(request: NextRequest) {
  const { amount, currency } = await request.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
  }

  if (!currency) {
    return NextResponse.json({ error: 'Currency is required' }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
    });
  } catch (error) {
    let errorMessage = 'Failed to create PaymentIntent';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    console.error('Error creating PaymentIntent:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
