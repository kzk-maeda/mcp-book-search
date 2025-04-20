import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get API key from environment variables
const CALIL_API_KEY = process.env.CALIL_APPLICATION_KEY;

/**
 * シンプルな図書館情報の型
 */
interface LibraryInfo {
  libid: string;
  formal: string;
  short: string;
  systemid: string;
  systemname: string;
  libkey: string;
  category: string;
  pref: string;
  city: string;
  address: string;
  url_pc: string;
}

/**
 * Logger utility
 */
function log(message: string): void {
  console.error(`[calil-api] ${message}`);
}

/**
 * 蔵書APIレスポンスの型 (実際のAPIレスポンス形式に合わせた修正版)
 */
interface BookResponse {
  session: string;
  continue: 0 | 1;
  books: {
    [isbn: string]: {
      [systemid: string]: {
        status: string;
        libkey: {
          [libkey: string]: string;  // ここが重要: 図書館キーに対する値は直接文字列
        };
        reserveurl?: string;
      }
    }
  }
}

/**
 * シンプル化されたCalil API サービス
 */
export class CalilApiService {
  private apiBaseUrl = 'https://api.calil.jp/library';
  private apiCheckUrl = 'https://api.calil.jp/check';
  private apiKey: string;

  constructor() {
    if (!CALIL_API_KEY) {
      throw new Error('CALIL_APPLICATION_KEY is not defined in environment variables');
    }
    this.apiKey = CALIL_API_KEY;
    log('CalilApiService initialized');
  }

  /**
   * JSONPレスポンスをJSONに変換
   */
  private parseJsonpResponse(text: string): any {
    if (text.startsWith('callback(') && text.endsWith(');')) {
      const jsonText = text.replace(/^callback\(/, '').replace(/\);$/, '');
      return JSON.parse(jsonText);
    }
    return JSON.parse(text);
  }

  /**
   * 図書館一覧を取得
   * @param pref 都道府県名（必須）
   * @param city 市区町村名（任意）
   */
  async getLibraries(pref: string, city?: string): Promise<LibraryInfo[]> {
    try {
      const params = new URLSearchParams({
        appkey: this.apiKey,
        format: 'json',
        pref: pref
      });
      
      if (city) {
        params.append('city', city);
      }
      
      const url = `${this.apiBaseUrl}?${params.toString()}`;
      log(`Fetching libraries: pref=${pref}${city ? ', city=' + city : ''}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const text = await response.text();
      const libraries = this.parseJsonpResponse(text);
      
      return Array.isArray(libraries) ? libraries : [];
    } catch (error) {
      log(`Error fetching libraries: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 蔵書検索の実行
   * @param isbn 検索対象ISBN（単一または複数カンマ区切り）
   * @param systemids 図書館システムID（単一または複数カンマ区切り）
   */
  async checkBooks(isbn: string, systemids: string): Promise<BookResponse> {
    try {
      const params = new URLSearchParams({
        appkey: this.apiKey,
        isbn: isbn,
        systemid: systemids,
        format: 'json'
      });
      
      const url = `${this.apiCheckUrl}?${params.toString()}`;
      log(`Checking books: isbn=${isbn}, systemids=${systemids}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const text = await response.text();
      const result = this.parseJsonpResponse(text) as BookResponse;
      
      // ポーリングが必要な場合
      if (result.continue === 1) {
        return this.pollResults(result.session);
      }
      
      return result;
    } catch (error) {
      log(`Error checking books: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 結果ポーリング
   * @param session セッションID
   */
  private async pollResults(session: string, maxRetries: number = 5): Promise<BookResponse> {
    try {
      for (let i = 0; i < maxRetries; i++) {
        // ポーリング間隔を設定（1秒）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const params = new URLSearchParams({
          appkey: this.apiKey,
          session: session,
          format: 'json'
        });
        
        const url = `${this.apiCheckUrl}?${params.toString()}`;
        log(`Polling results: session=${session}, attempt=${i+1}/${maxRetries}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }
        
        const text = await response.text();
        const result = this.parseJsonpResponse(text) as BookResponse;
        
        // ポーリング完了
        if (result.continue === 0) {
          return result;
        }
      }
      
      throw new Error(`Polling timed out after ${maxRetries} attempts`);
    } catch (error) {
      log(`Error polling results: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 市区町村内の図書館で本を検索
   * @param isbn ISBN
   * @param pref 都道府県名
   * @param city 市区町村名
   */
  async searchBookInCity(isbn: string, pref: string, city: string): Promise<any> {
    try {
      // 1. まず市区町村の図書館一覧を取得
      const libraries = await this.getLibraries(pref, city);
      
      if (libraries.length === 0) {
        return { error: `No libraries found in ${pref}, ${city}` };
      }
      
      // 2. システムIDの一覧を作成
      const systemIds = [...new Set(libraries.map(lib => lib.systemid))].join(',');
      
      // 3. 蔏書検索API呼び出し
      const result = await this.checkBooks(isbn, systemIds);
      
      // 4. 結果を整形して返す
      return this.formatBookResult(result, libraries, isbn);
    } catch (error) {
      log(`Error searching book in city: ${error instanceof Error ? error.message : String(error)}`);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 検索結果を整形して返す (修正版)
   */
  private formatBookResult(bookResponse: BookResponse, libraries: LibraryInfo[], isbn: string): any {
    try {
      // デバッグ情報を出力
      log(`API response for ISBN ${isbn}: ${JSON.stringify(bookResponse)}`);
      
      const result = {
        isbn: isbn,
        libraries: [] as any[]
      };
      
      // books配下にISBNがない場合
      if (!bookResponse.books || !bookResponse.books[isbn]) {
        log(`No data found for ISBN ${isbn}`);
        return result;
      }
      
      // 各システムの結果を処理
      const bookData = bookResponse.books[isbn];
      
      for (const systemId in bookData) {
        const systemData = bookData[systemId];
        log(`System data for ${systemId}: ${JSON.stringify(systemData)}`);
        
        // システムステータスがOKまたはCacheの場合のみ処理
        if (systemData.status !== 'OK' && systemData.status !== 'Cache') {
          log(`Skipping system ${systemId} due to status: ${systemData.status}`);
          continue;
        }
        
        // 対象のシステムに属する図書館を取得
        const systemLibraries = libraries.filter(lib => lib.systemid === systemId);
        
        // libkeyが存在しない場合はスキップ
        if (!systemData.libkey) {
          log(`No libkey data for system ${systemId}`);
          continue;
        }
        
        // 各図書館の蔵書状態を処理
        for (const libKey in systemData.libkey) {
          const libraryInfo = systemLibraries.find(lib => lib.libkey === libKey);
          
          if (!libraryInfo) {
            log(`Library with key ${libKey} not found in system ${systemId}`);
            continue;
          }
          
          // 貸出ステータスの取得 (修正部分)
          // APIの仕様では `libkey` の値は直接文字列
          const lendingStatus = systemData.libkey[libKey] || '不明';
          
          log(`Library: ${libraryInfo.formal}, status: ${lendingStatus}`);
          
          // 予約URLの構築
          let reserveUrl = null;
          if (systemData.reserveurl && lendingStatus !== '蔵書なし') {
            reserveUrl = systemData.reserveurl
              .replace('{{isbn}}', isbn)
              .replace('{{systemid}}', systemId)
              .replace('{{libkey}}', libKey);
          }
          
          // 結果に追加
          result.libraries.push({
            name: libraryInfo.formal,
            status: lendingStatus,
            reserveUrl: reserveUrl
          });
        }
      }
      
      return result;
    } catch (error) {
      log(`Error formatting book result: ${error instanceof Error ? error.message : String(error)}`);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}
