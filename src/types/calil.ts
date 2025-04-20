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
 * 書籍検索レスポンスの型（プレースホルダー）
 */
export interface BookSearchResponse {
  result: string;
  // 将来的に実装される予定の書籍検索結果の型
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
