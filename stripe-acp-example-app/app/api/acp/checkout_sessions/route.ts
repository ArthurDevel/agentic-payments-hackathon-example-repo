/**
 * API Route: Create Checkout Session (ACP Agentic Checkout Spec)
 *
 * Responsibilities:
 * - Creates new checkout session
 * - Calculates line items, totals
 * - Stores session in memory
 * - Returns checkout session following ACP spec
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  CheckoutSession,
  CreateCheckoutRequest,
  LineItem,
  FulfillmentOption,
  TotalItem,
} from '@/lib/types/checkout';
import { Product } from '@/lib/types/product';
import productsData from '@/data/products.json';

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

function writeSessionsToFile(sessions: Map<string, CheckoutSession>): void {
  try {
    const data = JSON.stringify(Array.from(sessions.entries()), null, 2);
    fs.writeFileSync(SESSIONS_FILE_PATH, data, 'utf-8');
  } catch (error) {
    console.error('Error writing checkout sessions file:', error);
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CURRENCY = 'usd';
const TAX_RATE = 0.0875; // 8.75% sales tax
const FULFILLMENT_OPTIONS: FulfillmentOption[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    amount: 500, // $5.00
    description: '5-7 business days',
  },
  {
    id: 'express',
    name: 'Express Shipping',
    amount: 1500, // $15.00
    description: '2-3 business days',
  },
  {
    id: 'overnight',
    name: 'Overnight Shipping',
    amount: 2500, // $25.00
    description: 'Next business day',
  },
];

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

// const checkoutSessions = new Map<string, CheckoutSession>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a unique checkout session ID
 * @returns Checkout session ID string
 */
function generateCheckoutId(): string {
  return `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculates line items from cart items
 * @param items - Cart items with product IDs and quantities
 * @returns Array of line items with pricing
 */
function calculateLineItems(items: CreateCheckoutRequest['items']): LineItem[] {
  const products = productsData as Product[];

  return items.map((item) => {
    const product = products.find((p) => p.id === item.id);
    if (!product) {
      throw new Error(`Product not found: ${item.id}`);
    }

    const baseAmount = product.price * item.quantity;
    const discount = 0;
    const subtotal = baseAmount - discount;
    const tax = 0; // Tax calculated after address/shipping

    return {
      id: item.id,
      item: item,
      base_amount: baseAmount,
      discount,
      total: subtotal + tax,
      subtotal,
      tax,
    };
  });
}

/**
 * Calculates totals for checkout session
 * @param lineItems - Line items in checkout
 * @param shippingAmount - Shipping cost
 * @param taxAmount - Tax amount
 * @returns Array of total line items
 */
function calculateTotals(
  lineItems: LineItem[],
  shippingAmount: number,
  taxAmount: number
): TotalItem[] {
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal + shippingAmount + taxAmount;

  return [
    {
      label: 'Subtotal',
      amount: subtotal,
    },
    {
      label: 'Shipping',
      amount: shippingAmount,
    },
    {
      label: 'Tax',
      amount: taxAmount,
    },
    {
      label: 'Total',
      amount: total,
    },
  ];
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * POST handler to create checkout session
 * @param request - Next.js request object with checkout creation data
 * @returns JSON response with created checkout session
 */
export async function POST(request: NextRequest): Promise<NextResponse<CheckoutSession>> {
  const body: CreateCheckoutRequest = await request.json();

  if (!body.items || body.items.length === 0) {
    throw new Error('Items are required');
  }

  const checkoutId = generateCheckoutId();
  const lineItems = calculateLineItems(body.items);

  // Initial state: no shipping or tax yet
  const shippingAmount = 0;
  const taxAmount = 0;
  const totals = calculateTotals(lineItems, shippingAmount, taxAmount);

  const checkout: CheckoutSession = {
    id: checkoutId,
    buyer: body.buyer,
    payment_provider: {
      provider: 'stripe',
      supported_payment_methods: ['card'],
    },
    status: body.fulfillment_address ? 'not_ready_for_payment' : 'not_ready_for_payment',
    currency: DEFAULT_CURRENCY,
    line_items: lineItems,
    fulfillment_address: body.fulfillment_address,
    fulfillment_options: FULFILLMENT_OPTIONS,
    fulfillment_option_id: undefined,
    totals,
    messages: [],
    links: [],
  };

  const checkoutSessions = readSessionsFromFile();
  checkoutSessions.set(checkoutId, checkout);
  writeSessionsToFile(checkoutSessions);

  return NextResponse.json(checkout);
}

// Export storage for use by other endpoints
// export { checkoutSessions };
