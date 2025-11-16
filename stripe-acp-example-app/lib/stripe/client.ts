/**
 * Stripe client initialization
 *
 * Responsibilities:
 * - Initialize Stripe with secret key from environment
 * - Export configured Stripe instance for use across the application
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
});
