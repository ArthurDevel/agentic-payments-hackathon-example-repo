/**
 * API Route: Streaming Chat with dat1 gpt-oss-120b model + Stripe MCP Integration
 *
 * Responsibilities:
 * - Proxies streaming chat requests to dat1 API
 * - Handles API key authentication securely on the server side
 * - Streams chat completion responses to the frontend using Server-Sent Events
 * - Executes Stripe MCP tools when the LLM requests them
 * - Injects tool results back into the conversation
 */

import { NextRequest } from 'next/server';
import { getStripeTools } from '@/lib/mcp/tools';
import { callStripeMCPTool } from '@/lib/mcp/stripe-mcp';

// ============================================================================
// CONSTANTS
// ============================================================================

const DAT1_API_URL = 'https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 5000;

// ============================================================================
// INTERFACES
// ============================================================================

interface ChatRequestBody {
  messages: Array<{
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
    tool_call_id?: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface StreamingChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: any;
  timings?: any;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parses SSE chunk and extracts JSON data
 */
function parseSSEChunk(chunk: string): StreamingChunk | null {
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      
      if (data === '[DONE]') {
        return null;
      }

      try {
        return JSON.parse(data);
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }
  }

  return null;
}

/**
 * Executes a tool call via Stripe MCP
 */
async function executeToolCall(
  toolName: string,
  toolArguments: string
): Promise<string> {
  try {
    let parsedArgs: Record<string, any> = {};
    
    if (toolArguments) {
      parsedArgs = JSON.parse(toolArguments);
    }

    const result = await callStripeMCPTool(toolName, parsedArgs);
    
    // MCP returns result in content array format
    if (result?.content && Array.isArray(result.content)) {
      const textContent = result.content.find((item: any) => item.type === 'text');
      if (textContent?.text) {
        return textContent.text;
      }
    }

    // Fallback: stringify the entire result
    return JSON.stringify(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: errorMessage });
  }
}

/**
 * Makes a streaming request to dat1 API with tool support
 */
async function makeDat1Request(
  messages: ChatRequestBody['messages'],
  tools: any[],
  temperature: number,
  maxTokens: number
): Promise<Response> {
  if (!process.env.DAT1_API_KEY) {
    throw new Error('DAT1_API_KEY is not configured');
  }

  const requestBody: any = {
    messages,
    temperature,
    stream: true,
    max_tokens: maxTokens,
  };

  // Only include tools if we have any
  if (tools.length > 0) {
    requestBody.tools = tools;
  }

  return fetch(DAT1_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.DAT1_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * POST handler for streaming chat completions with tool support
 * @param request - Next.js request object containing chat messages
 * @returns Streaming response with chat completion chunks
 */
export async function POST(request: NextRequest) {
  const body: ChatRequestBody = await request.json();

  if (!process.env.DAT1_API_KEY) {
    throw new Error('DAT1_API_KEY is not configured');
  }

  // Get Stripe tools (cached)
  let tools: any[] = [];
  try {
    tools = await getStripeTools();
  } catch (error) {
    console.error('Failed to fetch Stripe tools:', error);
    // Continue without tools if fetch fails
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let messages = [...body.messages];
      const temperature = body.temperature || DEFAULT_TEMPERATURE;
      const maxTokens = body.max_tokens || DEFAULT_MAX_TOKENS;
      let iterationCount = 0;
      const MAX_ITERATIONS = 10; // Prevent infinite loops

      while (iterationCount < MAX_ITERATIONS) {
        iterationCount++;

        // Make request to dat1 API
        const response = await makeDat1Request(messages, tools, temperature, maxTokens);

        if (!response.ok) {
          const errorText = await response.text();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: `dat1 API error: ${errorText}` })}\n\n`)
          );
          controller.close();
          return;
        }

        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Response body is not readable' })}\n\n`)
          );
          controller.close();
          return;
        }

        let accumulatedContent = '';
        let toolCalls: Array<{
          id: string;
          type: string;
          function: {
            name: string;
            arguments: string;
          };
        }> = [];
        let finalData: StreamingChunk | null = null;
        let hasToolCalls = false;

        // Read streaming chunks
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const parsed = parseSSEChunk(chunk);

          if (!parsed) {
            // Forward [DONE] marker
            if (chunk.includes('[DONE]')) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
            continue;
          }

          // Check for tool calls
          const choice = parsed.choices?.[0];
          if (choice) {
            // Handle delta (streaming)
            if (choice.delta) {
              if (choice.delta.content) {
                accumulatedContent += choice.delta.content;
                // Forward content chunks
                controller.enqueue(encoder.encode(chunk + '\n'));
              }

              if (choice.delta.tool_calls) {
                hasToolCalls = true;
                for (const toolCall of choice.delta.tool_calls) {
                  const index = toolCall.index ?? 0;
                  if (!toolCalls[index]) {
                    toolCalls[index] = {
                      id: toolCall.id || `call_${Date.now()}_${index}`,
                      type: toolCall.type || 'function',
                      function: {
                        name: toolCall.function?.name || '',
                        arguments: toolCall.function?.arguments || '',
                      },
                    };
                  } else {
                    // Append to existing tool call
                    toolCalls[index].function.arguments += toolCall.function?.arguments || '';
                    if (toolCall.id) {
                      toolCalls[index].id = toolCall.id;
                    }
                    if (toolCall.function?.name) {
                      toolCalls[index].function.name = toolCall.function.name;
                    }
                  }
                }
              }
            }

            // Handle complete message (non-streaming tool calls)
            if (choice.message?.tool_calls) {
              hasToolCalls = true;
              toolCalls = choice.message.tool_calls;
            }

            // Check finish reason
            if (choice.finish_reason === 'tool_calls') {
              hasToolCalls = true;
            }

            // Capture final data
            if (parsed.usage || parsed.timings) {
              finalData = parsed;
            }
          }
        }

        // If we have tool calls, execute them
        if (hasToolCalls && toolCalls.length > 0) {
          // Add assistant message with tool calls
          messages.push({
            role: 'assistant',
            content: accumulatedContent || null,
            tool_calls: toolCalls,
          });

          // Execute all tool calls
          const toolResults = await Promise.all(
            toolCalls.map(async (toolCall) => {
              const result = await executeToolCall(
                toolCall.function.name,
                toolCall.function.arguments
              );

              return {
                role: 'tool' as const,
                content: result,
                tool_call_id: toolCall.id,
              };
            })
          );

          // Add tool results to messages
          messages.push(...toolResults);

          // Continue loop to get final response
          continue;
        }

        // No tool calls, send final data and close
        if (finalData) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
          );
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        return;
      }

      // Max iterations reached
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ error: 'Maximum iterations reached' })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
