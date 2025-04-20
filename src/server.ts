import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ServerConfig, parseArgs, validateConfig } from './index.js';
import { CalilApiService } from './services/calilApi.js';

// ----- MCP Server Implementation -----

/**
 * Logger utility
 */
export function logger(message: string): void {
  console.error(`[mcp-book-search] ${message}`);
}

/**
 * Create MCP server
 */
export function createServer(): Server {
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
export function setupListResourcesHandler(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger("ListResources request received");
    // In an actual implementation, return a list of resources here
    return { "success": true };
  });
}

/**
 * Set up handler for reading resources
 */
export function setupReadResourceHandler(server: Server): void {
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
export function setupListToolsHandler(server: Server): void {
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
        {
          name: "get_libraries_by_prefecture",
          description: "Get libraries in the specified prefecture using the Calil API",
          inputSchema: {
            type: "object",
            properties: {
              prefecture: { 
                type: "string",
                description: "Prefecture name in Japanese (e.g., '東京都', '大阪府')"
              },
            },
            required: ["prefecture"]
          },
        }
      ],
    };
  });
}

/**
 * Set up handler for calling tools
 */
export function setupCallToolHandler(server: Server): void {
  // Initialize the Calil API service
  const calilApiService = new CalilApiService();
  
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
    else if (request.params.name === "get_libraries_by_prefecture") {
      logger(`Received get_libraries_by_prefecture request for prefecture: ${request.params.arguments?.prefecture}`);
      
      const prefecture = request.params.arguments?.prefecture;
      
      if (!prefecture || typeof prefecture !== 'string') {
        logger(`Invalid prefecture parameter: ${JSON.stringify(request.params.arguments)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Prefecture parameter is required and must be a string" })
            }
          ]
        };
      }
      
      try {
        logger(`Fetching libraries for prefecture: ${prefecture}`);
        const librariesData = await calilApiService.getLibrariesByPrefecture(prefecture);
        logger(`API response received - raw data type: ${typeof librariesData}, isArray: ${Array.isArray(librariesData)}`);
        
        if (Array.isArray(librariesData)) {
          logger(`Library data is an array with ${librariesData.length} items`);
        } else if (typeof librariesData === 'object') {
          logger(`Library data is an object with ${Object.keys(librariesData).length} keys: ${Object.keys(librariesData).join(', ')}`);
        }
        
        // Process the library data into a consistent format
        const processedLibraries = Array.isArray(librariesData) ? librariesData : 
          Object.values(librariesData).flatMap((system: any) => {
            if (system.libkey && typeof system.libkey === 'object') {
              return Object.entries(system.libkey).map(([libkey, lib]) => {
                const typedLib = lib as any;
                return {
                  libid: typedLib.libid || '',
                  formal: typedLib.formal || '',
                  short: typedLib.short || '',
                  systemid: system.systemid || '',
                  systemname: system.systemname || '',
                  libkey: libkey,
                  category: typedLib.category || '',
                  post: typedLib.post || '',
                  tel: typedLib.tel || '',
                  pref: typedLib.pref || '',
                  city: typedLib.city || '',
                  address: typedLib.address || '',
                  geocode: typedLib.geocode || '',
                  isil: typedLib.isil || '',
                  faid: typedLib.faid || null,
                  url_pc: typedLib.url_pc || ''
                };
              });
            }
            return [];
          });
        
        logger(`Processed ${processedLibraries.length} libraries after data transformation`);
        
        // Create a properly structured response
        const response = {
          prefecture: prefecture,
          libraryCount: processedLibraries.length,
          libraries: processedLibraries.slice(0, 10) // Limit to first 10 libraries to avoid response size issues
        };
        
        logger(`Returning response with ${response.libraries.length} libraries (limited from ${response.libraryCount} total)`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response)
            }
          ]
        };
      } catch (error) {
        logger(`Error fetching libraries: ${error}`);
        logger(`Error details: ${error instanceof Error ? error.stack : 'Unknown error format'}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ 
                error: `Failed to fetch libraries: ${error instanceof Error ? error.message : String(error)}` 
              })
            }
          ]
        };
      }
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
