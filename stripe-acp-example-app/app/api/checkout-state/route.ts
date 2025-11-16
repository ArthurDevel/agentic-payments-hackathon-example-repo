/**
 * API Route: Get Checkout State
 *
 * Responsibilities:
 * - Returns the latest checkout state for a conversation
 * - Parses conversation file to find ready_for_payment checkout
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONVERSATIONS_DIR = join(process.cwd(), 'conversations');
const DEFAULT_CURRENCY = 'usd';

// ============================================================================
// INTERFACES
// ============================================================================

interface ConversationMessage {
  role: string;
  content: string;
  name?: string;
}

interface CheckoutData {
  id: string;
  status: string;
  currency?: string;
  totals?: Array<{ label: string; amount: number }>;
}

interface CheckoutResponse {
  checkout: {
    checkoutId: string;
    amount: number;
    currency: string;
  } | null;
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * GET handler to retrieve checkout state from conversation
 * @param request - Next.js request object with conversationId query parameter
 * @returns JSON response with checkout state or null
 */
export async function GET(request: NextRequest): Promise<NextResponse<CheckoutResponse | { error: string }>> {
  const searchParams = request.nextUrl.searchParams;
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  try {
    const filename = `conversation-${conversationId}.json`;
    const filepath = join(CONVERSATIONS_DIR, filename);

    if (!existsSync(filepath)) {
      return NextResponse.json({ checkout: null });
    }

    const content = readFileSync(filepath, 'utf-8');
    const conversation = JSON.parse(content) as ConversationMessage[];

    // Find the latest update_checkout or create_checkout tool result
    for (let i = conversation.length - 1; i >= 0; i--) {
      const message = conversation[i];
      if (message.role === 'tool' && (message.name === 'update_checkout' || message.name === 'create_checkout')) {
        try {
          const checkoutData = JSON.parse(message.content) as CheckoutData;
          if (checkoutData.status === 'ready_for_payment') {
            const totalAmount = checkoutData.totals?.find((total) => total.label === 'Total')?.amount;
            if (totalAmount) {
              return NextResponse.json({
                checkout: {
                  checkoutId: checkoutData.id,
                  amount: totalAmount,
                  currency: checkoutData.currency || DEFAULT_CURRENCY,
                },
              });
            }
          }
        } catch (parseError) {
          // Skip invalid JSON in message content
          continue;
        }
      }
    }

    return NextResponse.json({ checkout: null });
  } catch (error) {
    console.error('Error reading checkout state:', error);
    return NextResponse.json({ error: 'Failed to read checkout state' }, { status: 500 });
  }
}

