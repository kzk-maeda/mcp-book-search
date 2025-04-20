import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { 
  CalilLibraryRawData, 
  LibraryInfo,
  extractLibraryInfo
} from '../types/calil.js';

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
  async getLibrariesByPrefecture(pref: string): Promise<CalilLibraryRawData[]> {
    try {
      const url = `${this.apiBaseUrl}?appkey=${this.apiKey}&format=json&pref=${encodeURIComponent(pref)}`;
      log(`Calling Calil API with URL: ${url.replace(this.apiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(url);
      log(`API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const text = await response.text();
      log(`Raw response length: ${text.length} characters`);
      
      // APIはJSONP形式で返されることがある。形式に応じて適切に処理
      let jsonData;
      if (text.startsWith('callback(') && text.endsWith(');')) {
        // JSONP形式の場合、不要な部分を削除
        const jsonText = text.replace(/^callback\(/, '').replace(/\);$/, '');
        jsonData = JSON.parse(jsonText);
      } else {
        // 通常のJSON形式の場合
        jsonData = JSON.parse(text);
      }
      
      log(`Parsed data: Array=${Array.isArray(jsonData)}, Length=${Array.isArray(jsonData) ? jsonData.length : 'not array'}`);
      
      return jsonData as CalilLibraryRawData[];
    } catch (error) {
      log(`Error fetching libraries: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Process raw library data into a standardized format
   * @param rawData Raw library data from Calil API
   * @returns Processed library information
   */
  processLibraryData(rawData: CalilLibraryRawData[]): LibraryInfo[] {
    return Array.isArray(rawData) ? rawData.flatMap((system) => extractLibraryInfo([system])) : 
      Object.values(rawData).flatMap((system) => extractLibraryInfo([system as CalilLibraryRawData]));
  }

  /**
   * Fetch libraries in the specified city within a prefecture
   * @param pref Prefecture name in Japanese (e.g., "千葉県", "東京都")
   * @param city City name in Japanese (e.g., "八千代市", "横浜市")
   * @returns Filtered array of library information for the specified city
   */
  async getLibrariesByCity(pref: string, city: string): Promise<LibraryInfo[]> {
    try {
      log(`Fetching libraries for prefecture: ${pref} and city: ${city}`);
      
      // 都道府県と市区町村名を指定して直接APIを呼び出す
      const url = `${this.apiBaseUrl}?appkey=${this.apiKey}&format=json&pref=${encodeURIComponent(pref)}&city=${encodeURIComponent(city)}`;
      log(`Calling Calil API with URL: ${url.replace(this.apiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Handle JSONP or JSON response
      let jsonData;
      if (text.startsWith('callback(') && text.endsWith(');')) {
        const jsonText = text.replace(/^callback\(/, '').replace(/\);$/, '');
        jsonData = JSON.parse(jsonText);
      } else {
        jsonData = JSON.parse(text);
      }
      
      // Convert raw data to standardized format
      const libraries = this.processLibraryData(jsonData);
      
      // Explicitly filter by city name to ensure accuracy
      const filteredLibraries = libraries.filter(library => {
        // Check if the library's address contains the city name
        return library.address && library.address.includes(city);
      });
      
      log(`Found ${filteredLibraries.length} libraries in ${city} (filtered from ${libraries.length} total)`);
      return filteredLibraries;
    } catch (error) {
      log(`Error fetching libraries: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack trace: ${error.stack}`);
      }
      throw error;
    }
  }
}
