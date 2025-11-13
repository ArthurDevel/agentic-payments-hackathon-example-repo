/**
 * API Route: Streaming Chat with dat1 gpt-oss-120b model
 *
 * Responsibilities:
 * - Proxies streaming chat requests to dat1 API
 * - Handles API key authentication securely on the server side
 * - Streams chat completion responses to the frontend using Server-Sent Events
 */

import { NextRequest } from 'next/server';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DAT1_API_URL = 'https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 5000;

// ============================================================================
// INTERFACES
// ============================================================================

interface ChatRequestBody {
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * POST handler for streaming chat completions
 * @param request - Next.js request object containing chat messages
 * @returns Streaming response with chat completion chunks
 */
export async function POST(request: NextRequest) {
  const body: ChatRequestBody = await request.json();

  if (!process.env.DAT1_API_KEY) {
    throw new Error('DAT1_API_KEY is not configured');
  }

  const apiUrl = process.env.DAT1_CHAT_ENDPOINT_OVERRIDE || DEFAULT_DAT1_API_URL;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.DAT1_API_KEY,
    },
    body: JSON.stringify({
      messages: body.messages,
      temperature: body.temperature || DEFAULT_TEMPERATURE,
      stream: true,
      max_tokens: body.max_tokens || DEFAULT_MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`dat1 API error: ${errorText}`);
  }

  // Return the streaming response directly to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
