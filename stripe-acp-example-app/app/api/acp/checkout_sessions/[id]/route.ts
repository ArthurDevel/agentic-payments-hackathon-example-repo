/**
 * API Route: Get/Update Checkout Session (ACP Agentic Checkout Spec)
 *
 * Responsibilities:
 * - GET: Returns existing checkout session
 * - POST: Updates checkout session (address, shipping option)
 * - Recalculates tax and shipping when updated
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CheckoutSession, UpdateCheckoutRequest, TotalItem } from '@/lib/types/checkout';

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

const TAX_RATE = 0.0875; // 8.75% sales tax

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates tax based on subtotal
 * @param subtotal - Subtotal amount in cents
 * @returns Tax amount in cents
 */
function calculateTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE);
}

/**
 * Recalculates totals for checkout session
 * @param checkout - Checkout session to update
 * @returns Updated totals array
 */
function recalculateTotals(checkout: CheckoutSession): TotalItem[] {
  const subtotal = checkout.line_items.reduce((sum, item) => sum + item.subtotal, 0);

  // Calculate shipping
  let shippingAmount = 0;
  if (checkout.fulfillment_option_id) {
    const shippingOption = checkout.fulfillment_options.find(
      (opt) => opt.id === checkout.fulfillment_option_id
    );
    shippingAmount = shippingOption?.amount || 0;
  }

  // Calculate tax (only if address is provided)
  const taxAmount = checkout.fulfillment_address ? calculateTax(subtotal) : 0;

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
// MAIN ENDPOINTS
// ============================================================================

/**
 * GET handler to retrieve checkout session
 * @param request - Next.js request object
 * @param params - Route parameters containing checkout ID
 * @returns JSON response with checkout session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CheckoutSession>> {
  const { id } = await params;

  const checkoutSessions = readSessionsFromFile();
  const checkout = checkoutSessions.get(id);
  if (!checkout) {
    throw new Error(`Checkout session not found: ${id}`);
  }

  return NextResponse.json(checkout);
}

/**
 * POST handler to update checkout session
 * @param request - Next.js request object with update data
 * @param params - Route parameters containing checkout ID
 * @returns JSON response with updated checkout session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CheckoutSession>> {
  const { id } = await params;
  const body: UpdateCheckoutRequest = await request.json();

  const checkoutSessions = readSessionsFromFile();
  const checkout = checkoutSessions.get(id);
  if (!checkout) {
    throw new Error(`Checkout session not found: ${id}`);
  }

  // Update checkout fields
  if (body.buyer) {
    checkout.buyer = { ...checkout.buyer, ...body.buyer };
  }

  if (body.fulfillment_address) {
    checkout.fulfillment_address = body.fulfillment_address;
  }

  if (body.fulfillment_option_id) {
    checkout.fulfillment_option_id = body.fulfillment_option_id;
  }

  // Recalculate totals
  checkout.totals = recalculateTotals(checkout);

  // Update line items with tax
  const taxAmount = checkout.totals.find((t) => t.label === 'Tax')?.amount || 0;
  const taxPerItem = Math.round(taxAmount / checkout.line_items.length);
  checkout.line_items = checkout.line_items.map((item, index) => ({
    ...item,
    tax: index === checkout.line_items.length - 1
      ? taxAmount - taxPerItem * (checkout.line_items.length - 1) // Last item gets remainder
      : taxPerItem,
    total: item.subtotal + taxPerItem,
  }));

  // Update status
  if (checkout.fulfillment_address && checkout.fulfillment_option_id) {
    checkout.status = 'ready_for_payment';
  }

  checkoutSessions.set(id, checkout);
  writeSessionsToFile(checkoutSessions);

  return NextResponse.json(checkout);
}
