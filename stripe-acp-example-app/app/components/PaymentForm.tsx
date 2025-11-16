/**
 * Payment Form Component
 *
 * Responsibilities:
 * - Collects payment card details using Stripe Elements
 * - Creates PaymentMethod via Stripe.js
 * - Creates SharedPaymentToken via backend API
 * - Passes SPT token to agent via chat message
 */

'use client';

import { useState, FormEvent } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// ============================================================================
// INTERFACES
// ============================================================================

interface PaymentFormProps {
  checkoutId: string;
  amount: number;
  currency: string;
  onPaymentComplete: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

// ============================================================================
// PAYMENT FORM INTERNAL COMPONENT
// ============================================================================

function PaymentFormInternal({ checkoutId, amount, currency, onPaymentComplete, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe not loaded');
      return;
    }

    setIsProcessing(true);

    try {
      // Get card element
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card element not found');
      }

      // Create Payment Intent to get client secret
      const piResponse = await fetch('/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
        }),
      });

      if (!piResponse.ok) {
        const errorData = await piResponse.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { client_secret: clientSecret } = await piResponse.json();

      // Confirm the card payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardNumberElement,
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message || 'Failed to confirm payment');
      }

      if (!paymentIntent) {
        throw new Error('Payment intent not found after confirmation');
      }

      if (paymentIntent.status === 'succeeded') {
        onPaymentComplete(paymentIntent.id);
      } else {
        throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-300 rounded-lg p-3 bg-white">
        <CardNumberElement options={cardElementOptions} />
      </div>
      <div className="flex space-x-4">
        <div className="w-1/2 border border-gray-300 rounded-lg p-3 bg-white">
          <CardExpiryElement options={cardElementOptions} />
        </div>
        <div className="w-1/2 border border-gray-300 rounded-lg p-3 bg-white">
          <CardCvcElement options={cardElementOptions} />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
      >
        {isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PaymentForm({ checkoutId, amount, currency, onPaymentComplete, onError }: PaymentFormProps) {
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!stripePublishableKey) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Payment form unavailable: Stripe publishable key not configured</p>
      </div>
    );
  }

  const stripePromise = loadStripe(stripePublishableKey);

  const options: StripeElementsOptions = {
    mode: 'payment',
    amount,
    currency: currency.toLowerCase(),
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInternal
        checkoutId={checkoutId}
        amount={amount}
        currency={currency}
        onPaymentComplete={onPaymentComplete}
        onError={onError}
      />
    </Elements>
  );
}

