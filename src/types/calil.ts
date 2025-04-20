/**
 * Calil APIのレスポンスや内部データ表現に関する共通型定義
 */

/**
 * 図書館の基本情報
 */
export interface LibraryInfo {
  libid: string;
  formal: string;
  short: string;
  systemid: string;
  systemname: string;
  libkey: string;
  category: string;
  post: string;
  tel: string;
  pref: string;
  city: string;
  address: string;
  geocode: string;
  isil: string;
  faid: string | null;
  url_pc: string;
}

/**
 * Calil APIから返される図書館データの生の形式
 * APIレスポンスは各図書館の情報がフラットな配列として返される
 */
export interface CalilLibraryRawData {
  libid: string;
  formal: string;
  short: string;
  systemid: string;
  systemname: string;
  libkey: string;
  category: string;
  post: string;
  tel: string;
  pref: string;
  city: string;
  address: string;
  geocode: string;
  isil: string;
  faid?: string;
  url_pc: string;
  image?: string;
}

/**
 * 都道府県の図書館情報レスポンス
 */
export interface PrefectureLibrariesResponse {
  prefecture: string;
  libraryCount: number;
  libraries: LibraryInfo[];
}

/**
 * 市区町村の図書館情報レスポンス
 */
export interface CityLibrariesResponse extends PrefectureLibrariesResponse {
  city: string;
}

/**
 * エラーレスポンスの型
 */
export interface ErrorResponse {
  error: string;
}

/**
 * 書籍検索リクエストの型
 */
export interface BookSearchRequest {
  isbn?: string;
  isbn_list?: string[];
  prefecture: string;
  city?: string;
}

/**
 * 書籍検索レスポンスの型
 */
export interface BookSearchResponse {
  query: string;
  results: BookAvailabilityResult[];
}

/**
 * 蔵書検索のステータス
 */
export type BookAvailabilityStatus = 'OK' | 'Cache' | 'Running' | 'Error';

/**
 * 蔵書の貸出状態
 */
export type BookLendingStatus = '貸出可' | '蔵書あり' | '館内のみ' | '貸出中' | '予約中' | '準備中' | '休館中' | '蔵書なし' | '指定館ではない' | '-';

/**
 * 単一図書館の蔵書状態
 */
export interface LibraryBookStatus {
  status: BookLendingStatus;
  reserveUrl?: string;
  libkey: string;
}

/**
 * 図書館システム単位での蔵書状態
 */
export interface SystemBookStatus {
  status: BookAvailabilityStatus;
  books: {
    [isbn: string]: {
      [libkey: string]: LibraryBookStatus;
    };
  };
  reserve?: string;
}

/**
 * 蔵書検索のレスポンス
 */
export interface BookSearchRawResponse {
  session: string;
  continue: 0 | 1;
  status: BookAvailabilityStatus;
  books: {
    [isbn: string]: {
      [systemid: string]: SystemBookStatus;
    };
  };
}

/**
 * 整形された蔵書検索結果
 */
export interface BookAvailabilityResult {
  isbn: string;
  title?: string;
  availability: {
    library: LibraryInfo;
    status: BookLendingStatus;
    reserveUrl?: string;
  }[];
  raw: BookSearchRawResponse;
}

/**
 * Calil APIのデータからLibraryInfo型へ変換するためのユーティリティ関数
 * 
 * @param data 図書館情報の配列
 * @returns 整形された図書館情報の配列
 */
export function extractLibraryInfo(data: CalilLibraryRawData[]): LibraryInfo[] {
  if (Array.isArray(data)) {
    return data.map(lib => ({
      libid: lib.libid || '',
      formal: lib.formal || '',
      short: lib.short || '',
      systemid: lib.systemid || '',
      systemname: lib.systemname || '',
      libkey: lib.libkey || '',
      category: lib.category || '',
      post: lib.post || '',
      tel: lib.tel || '',
      pref: lib.pref || '',
      city: lib.city || '',
      address: lib.address || '',
      geocode: lib.geocode || '',
      isil: lib.isil || '',
      faid: lib.faid || null,
      url_pc: lib.url_pc || ''
    }));
  }
  return [];
}
