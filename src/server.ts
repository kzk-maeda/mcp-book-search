import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ServerConfig, parseArgs, validateConfig } from './index.js';

// ----- MCP Server Implementation -----

/**
 * Logger utility
 */
function logger(message: string): void {
  console.error(`[mcp-book-search] ${message}`);
}

/**
 * Create MCP server
 */
function createServer(): Server {
  return new Server(
    {
      name: "mcp-server/book-search",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );
}

/**
 * Set up handler for listing resources
 */
function setupListResourcesHandler(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger("ListResources request received");
    // In an actual implementation, return a list of resources here
    return { "success": true };
  });
}

/**
 * Set up handler for reading resources
 */
function setupReadResourceHandler(server: Server): void {
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    logger(`ReadResource request received for URI: ${request.params.uri}`);
    
    // In an actual implementation, return the resource content here
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify({ message: "This is a placeholder response" }),
        },
      ],
    };
  });
}

/**
 * Set up handler for listing tools
 */
function setupListToolsHandler(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger("ListTools request received");
    
    return {
      tools: [
        {
          name: "search_books",
          description: "Search for books based on query parameters",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              // Add other search parameters here
            },
          },
        },
      ],
    };
  });
}

/**
 * Set up handler for calling tools
 */
function setupCallToolHandler(server: Server): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "search_books") {
      logger(`Received search_books request with params: ${JSON.stringify(request.params.arguments)}`);
      
      // In an actual implementation, execute the search and return results here
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ result: "This is a placeholder search result" })
          }
        ]
      };
    }
    
    throw new Error(`Unknown tool: ${request.params.name}`);
  });
}

// ----- Server Startup Process -----

/**
 * Initialize and start the server
 */
export async function runServer(): Promise<void> {
  try {
    logger("Starting server...");
    
    // 1. Parse and validate configuration
    const config = parseArgs();
    validateConfig(config);
    
    // 2. Create server
    const server = createServer();
    
    // 3. Set up handlers
    setupListResourcesHandler(server);
    setupReadResourceHandler(server);
    setupListToolsHandler(server);
    setupCallToolHandler(server);
    
    // 4. Establish server connection
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger("Server started successfully");
  } catch (error: unknown) {
    // Error handling
    if (error instanceof Error) {
      logger(`Error: ${error.message}`);
    } else {
      logger(`Unknown error: ${String(error)}`);
    }
    process.exit(1);
  }
}
