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

const CONVERSATIONS_DIR = join(process.cwd(), 'conversations');

export async function GET(request: NextRequest) {
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
    const conversation = JSON.parse(content);

    // Find the latest update_checkout or create_checkout tool result
    for (let i = conversation.length - 1; i >= 0; i--) {
      const msg = conversation[i];
      if (msg.role === 'tool' && (msg.name === 'update_checkout' || msg.name === 'create_checkout')) {
        try {
          const checkoutData = JSON.parse(msg.content);
          if (checkoutData.status === 'ready_for_payment') {
            const totalAmount = checkoutData.totals?.find((t: any) => t.label === 'Total')?.amount;
            if (totalAmount) {
              return NextResponse.json({
                checkout: {
                  checkoutId: checkoutData.id,
                  amount: totalAmount,
                  currency: checkoutData.currency || 'usd',
                },
              });
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    return NextResponse.json({ checkout: null });
  } catch (error) {
    console.error('Error reading checkout state:', error);
    return NextResponse.json({ error: 'Failed to read checkout state' }, { status: 500 });
  }
}

