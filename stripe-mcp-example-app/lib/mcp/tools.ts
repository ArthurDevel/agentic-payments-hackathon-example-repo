/**
 * MCP Tools - Tool Definitions and Conversion
 *
 * Fetches tool definitions from Stripe MCP server and converts them
 * to OpenAI-compatible format for use with dat1 API.
 */

import { listStripeMCPTools, type MCPTool } from './stripe-mcp';

// ============================================================================
// TYPES
// ============================================================================

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// ============================================================================
// TOOL CACHE
// ============================================================================

let cachedTools: OpenAITool[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============================================================================
// TOOL CONVERSION
// ============================================================================

/**
 * Converts MCP tool schema to OpenAI tool format
 * @param mcpTool - MCP tool definition
 * @returns OpenAI-compatible tool definition
 */
function convertMCPToolToOpenAI(mcpTool: MCPTool): OpenAITool {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description || `Execute ${mcpTool.name} on Stripe`,
      parameters: (mcpTool.inputSchema && typeof mcpTool.inputSchema === 'object') 
        ? {
            type: mcpTool.inputSchema.type || 'object',
            properties: (mcpTool.inputSchema.properties as Record<string, any>) || {},
            required: mcpTool.inputSchema.required,
          }
        : {
            type: 'object',
            properties: {},
          },
    },
  };
}

/**
 * Fetches tools from Stripe MCP server and converts to OpenAI format
 * Uses caching to avoid repeated API calls
 * @param forceRefresh - Force refresh of cached tools
 * @returns Array of OpenAI-compatible tool definitions
 */
export async function getStripeTools(forceRefresh = false): Promise<OpenAITool[]> {
  const now = Date.now();

  // Return cached tools if still valid
  if (
    !forceRefresh &&
    cachedTools !== null &&
    now - cacheTimestamp < CACHE_TTL
  ) {
    return cachedTools;
  }

  try {
    const mcpTools = await listStripeMCPTools();
    cachedTools = mcpTools.map(convertMCPToolToOpenAI);
    cacheTimestamp = now;
    return cachedTools;
  } catch (error) {
    // If fetch fails and we have cached tools, return cache
    if (cachedTools !== null) {
      console.warn('Failed to fetch tools from MCP, using cache:', error);
      return cachedTools;
    }
    throw error;
  }
}

/**
 * Clears the tool cache
 */
export function clearToolCache(): void {
  cachedTools = null;
  cacheTimestamp = 0;
}

