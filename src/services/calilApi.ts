import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get API key from environment variables
const CALIL_API_KEY = process.env.CALIL_APPLICATION_KEY;

/**
 * Logger utility
 */
function log(message: string): void {
  console.error(`[calil-api] ${message}`);
}

/**
 * Interface for library data returned by Calil API
 */
interface CalilLibrary {
  systemid: string;
  systemname: string;
  libkey: Record<string, {
    libid: string;
    short: string;
    formal: string;
    url_pc: string;
    address: string;
    pref: string;
    city: string;
    post: string;
    tel: string;
    geocode: string;
    category: string;
    image: string;
  }>;
}

/**
 * Calil API service for interacting with libraries
 */
export class CalilApiService {
  private apiBaseUrl = 'https://api.calil.jp/library';
  private apiKey: string;

  constructor() {
    if (!CALIL_API_KEY) {
      throw new Error('CALIL_APPLICATION_KEY is not defined in environment variables');
    }
    this.apiKey = CALIL_API_KEY;
    log('CalilApiService initialized');
  }

  /**
   * Fetch libraries in the specified prefecture
   * @param pref Prefecture name in Japanese (e.g., "東京都", "大阪府")
   * @returns Array of library information
   */
  async getLibrariesByPrefecture(pref: string): Promise<any> {
    try {
      const url = `${this.apiBaseUrl}?appkey=${this.apiKey}&format=json&pref=${encodeURIComponent(pref)}`;
      log(`Calling Calil API with URL: ${url.replace(this.apiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(url);
      log(`API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      // Calil API returns JSONP by default, even with format=json
      // Need to extract the actual JSON from the response
      const text = await response.text();
      log(`Raw response length: ${text.length} characters`);
      log(`First 100 chars: ${text.substring(0, 100)}...`);
      
      const jsonText = text.replace(/^callback\(/, '').replace(/\);$/, '');
      log(`JSON text length after JSONP extraction: ${jsonText.length} characters`);
      
      const parsed = JSON.parse(jsonText);
      log(`Parsed result type: ${typeof parsed}, isArray: ${Array.isArray(parsed)}`);
      
      if (Array.isArray(parsed)) {
        log(`Parsed ${parsed.length} library records`);
      } else if (parsed && typeof parsed === 'object') {
        log(`Parsed object with ${Object.keys(parsed).length} keys`);
      }
      
      return parsed;
    } catch (error) {
      log(`Error fetching libraries: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack trace: ${error.stack}`);
      }
      throw error;
    }
  }
}
