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

const DEFAULT_DAT1_API_URL = 'https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat';

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * GET handler to return the current endpoint URL
 * @returns JSON response with endpoint URL
 */
export async function GET(): Promise<NextResponse> {
  const apiUrl = process.env.DAT1_CHAT_ENDPOINT_OVERRIDE || DEFAULT_DAT1_API_URL;

  return NextResponse.json({ endpoint: apiUrl });
}
