/**
 * Stripe MCP Client
 *
 * HTTP client for connecting to Stripe's MCP server at https://mcp.stripe.com
 * Uses JSON-RPC 2.0 protocol for communication.
 */

// ============================================================================
// TYPES
// ============================================================================

interface MCPServerRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id: number;
}

interface MCPServerResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STRIPE_MCP_URL = 'https://mcp.stripe.com/';

// ============================================================================
// MCP CLIENT
// ============================================================================

/**
 * Calls Stripe MCP server with JSON-RPC 2.0
 * @param method - MCP method name (e.g., 'tools/list', 'tools/call')
 * @param params - Method parameters
 * @returns MCP server response
 */
async function callStripeMCP(
  method: string,
  params?: any
): Promise<MCPServerResponse> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const request: MCPServerRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  };

  const response = await fetch(STRIPE_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MCP server error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: MCPServerResponse = await response.json();

  if (data.error) {
    throw new Error(`MCP error: ${data.error.message} (code: ${data.error.code})`);
  }

  return data;
}

/**
 * Lists all available tools from Stripe MCP server
 * @returns Array of MCP tool definitions
 */
export async function listStripeMCPTools(): Promise<MCPTool[]> {
  const response = await callStripeMCP('tools/list');
  return response.result?.tools || [];
}

/**
 * Calls a specific tool on Stripe MCP server
 * @param name - Tool name (e.g., 'create_customer', 'retrieve_balance')
 * @param arguments_ - Tool arguments
 * @returns Tool execution result
 */
export async function callStripeMCPTool(
  name: string,
  arguments_: Record<string, any>
): Promise<any> {
  const response = await callStripeMCP('tools/call', {
    name,
    arguments: arguments_,
  });

  return response.result;
}
