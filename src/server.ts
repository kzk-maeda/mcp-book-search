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
    return { "success": true };
  });
}

/**
 * Set up handler for reading resources
 */
export function setupReadResourceHandler(server: Server): void {
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    logger(`ReadResource request received for URI: ${request.params.uri}`);
    
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
              isbn: { 
                type: "string",
                description: "ISBN of the book to search for"
              },
              prefecture: { 
                type: "string",
                description: "Prefecture name in Japanese (e.g., '東京都', '千葉県')"
              },
              city: { 
                type: "string",
                description: "City name in Japanese (e.g., '八千代市', '横浜市')"
              }
            },
            required: ["query", "prefecture", "city"]
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
        },
        {
          name: "get_libraries_by_city",
          description: "Get libraries in the specified city using the Calil API",
          inputSchema: {
            type: "object",
            properties: {
              prefecture: { 
                type: "string",
                description: "Prefecture name in Japanese (e.g., '千葉県', '東京都')"
              },
              city: {
                type: "string",
                description: "City name in Japanese (e.g., '八千代市', '横浜市')"
              }
            },
            required: ["prefecture", "city"]
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
      
      const { query, prefecture, city, isbn } = request.params.arguments as { query: string; prefecture: string; city: string; isbn?: string };
      
      // 入力パラメータのバリデーション
      if (!prefecture || typeof prefecture !== 'string' || !city || typeof city !== 'string') {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Prefecture and city parameters are required" })
            }
          ]
        };
      }
      
      try {
        // ISBNの取得（指定がなければクエリから抽出）
        const targetIsbn = isbn ? isbn : extractIsbnFromQuery(query);
        
        if (!targetIsbn || (Array.isArray(targetIsbn) && targetIsbn.length === 0)) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "Could not determine ISBN from query" })
              }
            ]
          };
        }
        
        // シンプル化された蔵書検索の実行
        const finalIsbn = Array.isArray(targetIsbn) ? targetIsbn[0] : targetIsbn;
        logger(`Searching for book with ISBN: ${finalIsbn} in ${prefecture}, ${city}`);
        
        const result = await calilApiService.searchBookInCity(finalIsbn, prefecture, city);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        logger(`Error searching for books: ${error instanceof Error ? error.message : String(error)}`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Failed to search for books: ${error instanceof Error ? error.message : String(error)}` })
            }
          ]
        };
      }
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
              text: JSON.stringify({ error: "Prefecture parameter is required" })
            }
          ]
        };
      }
      
      try {
        logger(`Fetching libraries for prefecture: ${prefecture}`);
        const libraries = await calilApiService.getLibraries(prefecture);
        
        const response = {
          prefecture: prefecture,
          libraryCount: libraries.length,
          libraries: libraries.slice(0, 10) // 最初の10件に制限
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response)
            }
          ]
        };
      } catch (error) {
        logger(`Error fetching libraries: ${error instanceof Error ? error.message : String(error)}`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Failed to fetch libraries: ${error instanceof Error ? error.message : String(error)}` })
            }
          ]
        };
      }
    }
    else if (request.params.name === "get_libraries_by_city") {
      logger(`Received get_libraries_by_city request for prefecture: ${request.params.arguments?.prefecture} and city: ${request.params.arguments?.city}`);
      
      const prefecture = request.params.arguments?.prefecture;
      const city = request.params.arguments?.city;
      
      if (!prefecture || typeof prefecture !== 'string' || !city || typeof city !== 'string') {
        logger(`Invalid prefecture or city parameter: ${JSON.stringify(request.params.arguments)}`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Prefecture and city parameters are required" })
            }
          ]
        };
      }
      
      try {
        logger(`Fetching libraries for prefecture: ${prefecture} and city: ${city}`);
        const libraries = await calilApiService.getLibraries(prefecture, city);
        
        const response = {
          prefecture: prefecture,
          city: city,
          libraryCount: libraries.length,
          libraries: libraries.slice(0, 10) // 最初の10件に制限
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response)
            }
          ]
        };
      } catch (error) {
        logger(`Error fetching libraries: ${error instanceof Error ? error.message : String(error)}`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Failed to fetch libraries: ${error instanceof Error ? error.message : String(error)}` })
            }
          ]
        };
      }
    }
    
    throw new Error(`Unknown tool: ${request.params.name}`);
  });
}

/**
 * クエリ文字列からISBNを抽出する
 * 標準的なISBN-10およびISBN-13の両方に対応
 * 
 * @param query 検索クエリ
 * @returns 抽出されたISBN（見つからない場合は空配列）
 */
function extractIsbnFromQuery(query: string): string[] {
  // ISBN-13: 13桁の数字（ハイフン付きも可）
  // ISBN-10: 10桁の数字またはX終わり（ハイフン付きも可）
  const isbnRegex = /(?:ISBN(?:-1[03])?:?\s*)?(?=.{17}|.{13}|.{10})(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?[0-9]+[-\s]?[0-9]+[-\s]?[0-9X]/gi;
  
  const matches = query.match(isbnRegex);
  if (!matches) return [];
  
  // ハイフンや空白を削除して標準化
  return matches.map(match => match.replace(/[-\s]/g, ''));
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
