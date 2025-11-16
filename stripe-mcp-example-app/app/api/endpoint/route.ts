/**
 * API Route: Get current chat endpoint
 *
 * Responsibilities:
 * - Returns the configured endpoint URL for display in UI
 */

import { NextResponse } from 'next/server';

// ============================================================================
// CONSTANTS
// ============================================================================

const DAT1_API_URL = 'https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat';

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * GET handler to return the current endpoint URL
 * @returns JSON response with endpoint URL
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ endpoint: DAT1_API_URL });
}
