/**
 * API Route: Streaming Chat with dat1 gpt-120-oss model
 *
 * Responsibilities:
 * - Proxies streaming chat requests to dat1 API with tool calling support
 * - Defines shopping tools (search_products, create_checkout, update_checkout, complete_checkout)
 * - Executes tool calls by calling ACP endpoints
 * - Handles API key authentication securely on the server side
 * - Streams chat completion responses to the frontend using Server-Sent Events
 */

import { NextRequest } from 'next/server';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONVERSATIONS_DIR = join(process.cwd(), 'conversations');

const DAT1_API_URL = 'https://api.dat1.co/api/v1/collection/open-ai/chat/completions';
const DAT1_MODEL = 'gpt-120-oss';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 5000;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// ============================================================================
// INTERFACES
// ============================================================================

interface ChatMessage {
  role: string;
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface ChatRequestBody {
  messages: Array<ChatMessage>;
  temperature?: number;
  max_tokens?: number;
  conversationId?: string;
}

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products in the catalog. Returns a list of products matching the search query.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find products (e.g., "shoes", "nike", "running shoes")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_checkout',
      description: 'Create a new checkout session with selected products. Returns checkout ID and initial totals.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of items to add to checkout',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Product ID' },
                quantity: { type: 'number', description: 'Quantity to purchase' },
              },
              required: ['id', 'quantity'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_checkout',
      description: 'Update checkout session with shipping address and/or shipping option. Returns updated totals with tax and shipping.',
      parameters: {
        type: 'object',
        properties: {
          checkout_id: { type: 'string', description: 'Checkout session ID' },
          fulfillment_address: {
            type: 'object',
            description: 'Shipping address',
            properties: {
              line1: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              postal_code: { type: 'string' },
              country: { type: 'string' },
            },
          },
          fulfillment_option_id: { type: 'string', description: 'Shipping option ID (standard, express, overnight)' },
        },
        required: ['checkout_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_checkout',
      description: 'Complete the checkout with a SharedPaymentToken. Charges the payment and creates the order.',
      parameters: {
        type: 'object',
        properties: {
          checkout_id: { type: 'string', description: 'Checkout session ID' },
          spt_token: { type: 'string', description: 'SharedPaymentToken from Stripe' },
        },
        required: ['checkout_id', 'spt_token'],
      },
    },
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Execute a tool call by calling the appropriate ACP endpoint
 * @param toolName - Name of the tool to execute
 * @param args - Tool arguments as JSON string
 * @returns Tool execution result
 */
async function executeTool(toolName: string, args: string): Promise<string> {
  const parsedArgs = JSON.parse(args);

  switch (toolName) {
    case 'search_products': {
      const response = await fetch(`${BASE_URL}/api/acp/products/feed?q=${encodeURIComponent(parsedArgs.query)}`);
      if (!response.ok) throw new Error('Failed to search products');
      const data = await response.json();
      return JSON.stringify(data);
    }

    case 'create_checkout': {
      const response = await fetch(`${BASE_URL}/api/acp/checkout_sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedArgs.items, buyer: {} }),
      });
      if (!response.ok) throw new Error('Failed to create checkout');
      const data = await response.json();
      return JSON.stringify(data);
    }

    case 'update_checkout': {
      const { checkout_id, ...updateData } = parsedArgs;
      const response = await fetch(`${BASE_URL}/api/acp/checkout_sessions/${checkout_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error('Failed to update checkout');
      const data = await response.json();
      return JSON.stringify(data);
    }

    case 'complete_checkout': {
      const { checkout_id, spt_token } = parsedArgs;
      const response = await fetch(`${BASE_URL}/api/acp/checkout_sessions/${checkout_id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spt_token }),
      });
      if (!response.ok) throw new Error('Failed to complete checkout');
      const data = await response.json();
      return JSON.stringify(data);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * Call dat1 API
 * @param messages - Chat messages
 * @param shouldStream - Whether to stream the response
 * @returns Complete chat response or streaming response
 */
async function callDat1(messages: ChatMessage[], shouldStream: boolean = false): Promise<any> {
  if (!process.env.DAT1_API_KEY) {
    throw new Error('DAT1_API_KEY is not configured');
  }

  const requestBody: any = {
    model: DAT1_MODEL,
    messages,
    temperature: DEFAULT_TEMPERATURE,
    stream: shouldStream,
    max_tokens: DEFAULT_MAX_TOKENS,
    tools: TOOLS,
  };

  const response = await fetch(DAT1_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAT1_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`dat1 API error: ${errorText}`);
  }

  if (shouldStream) {
    return response;
  }

  return response.json();
}

/**
 * POST handler for streaming chat completions with tool calling
 * @param request - Next.js request object containing chat messages
 * @returns Streaming response with chat completion chunks
 */
/**
 * Load existing conversation from file
 * @param conversationId - Unique conversation identifier
 * @returns Existing messages or empty array
 */
function loadConversation(conversationId: string): ChatMessage[] {
  try {
    const filename = `conversation-${conversationId}.json`;
    const filepath = join(CONVERSATIONS_DIR, filename);

    if (existsSync(filepath)) {
      const content = readFileSync(filepath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load conversation:', error);
  }
  return [];
}

/**
 * Save conversation to a JSON file
 * @param messages - Conversation messages
 * @param conversationId - Unique conversation identifier
 */
function saveConversation(messages: ChatMessage[], conversationId: string): void {
  try {
    // Create conversations directory if it doesn't exist
    mkdirSync(CONVERSATIONS_DIR, { recursive: true });

    // Use conversationId as filename
    const filename = `conversation-${conversationId}.json`;
    const filepath = join(CONVERSATIONS_DIR, filename);

    // Save conversation
    writeFileSync(filepath, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();

    // Generate conversationId if not provided
    const conversationId = body.conversationId || new Date().toISOString().replace(/[:.]/g, '-');

    // Load existing conversation or start fresh
    const existingMessages = loadConversation(conversationId);

    // If we have existing messages, use them. Otherwise use messages from request
    let messages = existingMessages.length > 0 ? existingMessages : [...body.messages];

    // If we loaded existing messages, append only the NEW user message (last one)
    if (existingMessages.length > 0 && body.messages.length > 0) {
      const lastMessage = body.messages[body.messages.length - 1];
      messages.push(lastMessage);
    }

    // Loop until we get a final text response (no tool calls)
    // Maximum iterations to prevent infinite loops
    const MAX_ITERATIONS = 10;
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const completion = await callDat1(messages, false);

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error(`Invalid dat1 API response: ${JSON.stringify(completion)}`);
      }

      const choice = completion.choices[0];
      const assistantMessage = choice.message;

      // Log for debugging - check if model is trying to call tools but format is wrong
      if (!assistantMessage.content && !assistantMessage.tool_calls) {
        console.warn('Assistant message has no content and no tool_calls:', JSON.stringify(assistantMessage, null, 2));
      }

      // If the model wants to call tools, execute them
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push(assistantMessage);

        // Execute all tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          try {
            const toolResult = await executeTool(toolCall.function.name, toolCall.function.arguments);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: toolResult,
            });
          } catch (error) {
            // If tool execution fails, add error message as tool result
            const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: errorMessage }),
            });
          }
        }

        // Save after each tool execution cycle
        saveConversation(messages, conversationId);

        // Continue the loop to get next response
        continue;
      }

      // Check if message has content - if empty, force another iteration
      if (!assistantMessage.content || assistantMessage.content.trim() === '') {
        // If we have no content and no tool calls, something went wrong
        // Log the issue and add a user message to prompt the model
        console.warn('Received empty assistant message without tool calls. Retrying...');
        messages.push({
          role: 'user',
          content: 'Please provide a response.',
        });
        continue;
      }

      // Add the final assistant message to messages array
      messages.push(assistantMessage);

      // Save complete conversation including final response
      saveConversation(messages, conversationId);

      // Stream the content we already received (don't make another API call)
      // Create a streaming response that sends the content chunk by chunk
      const content = assistantMessage.content || '';
      const stream = new ReadableStream({
        async start(controller) {
          // Send content in chunks to simulate streaming
          const chunkSize = 10; // Characters per chunk
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            const data = JSON.stringify({
              choices: [{
                delta: { content: chunk },
                index: 0,
              }],
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          // Send done marker
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // If we've exceeded max iterations, return an error
    throw new Error('Maximum iterations reached. The conversation may be stuck in a loop.');
  } catch (error) {
    console.error('Chat stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Return error as streaming response
    const errorResponse = `data: ${JSON.stringify({
      error: {
        message: errorMessage,
        type: 'server_error',
      },
    })}\n\n`;
    
    return new Response(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}
