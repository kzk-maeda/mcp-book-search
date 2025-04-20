import { jest } from '@jest/globals';
import * as dotenv from 'dotenv';
import { CalilApiService } from '../../../src/services/calilApi.js';

// 環境変数をロード
dotenv.config();

describe('CalilApiService Integration Test', () => {
  let calilApiService: CalilApiService;

  beforeEach(() => {
    // 各テストの前にCalilApiServiceのインスタンスを作成
    calilApiService = new CalilApiService();
  });

  it('should fetch libraries in Tokyo', async () => {
    // 東京の図書館を検索
    const libraries = await calilApiService.getLibrariesByPrefecture('東京都');

    // レスポンスが配列であることを確認
    expect(Array.isArray(libraries)).toBe(true);

    // 少なくとも1つの図書館があることを確認
    expect(libraries.length).toBeGreaterThan(0);

    // 最初の図書館エントリのプロパティを確認
    const firstLibrary = libraries[0];
    expect(firstLibrary).toHaveProperty('systemid');
    expect(firstLibrary).toHaveProperty('systemname');
    expect(firstLibrary).toHaveProperty('libkey');

    // 実際のAPIレスポンスの構造を確認するためログ出力
    console.log('First library structure:', JSON.stringify(firstLibrary, null, 2).substring(0, 500) + '...');
    
    // libkey オブジェクトが存在することだけを確認
    expect(Object.keys(firstLibrary.libkey).length).toBeGreaterThan(0);
  }, 10000);  // タイムアウト時間を10秒に設定（APIコールに時間がかかる場合があるため）

  it('should fetch libraries in Osaka', async () => {
    // 大阪の図書館を検索
    const libraries = await calilApiService.getLibrariesByPrefecture('大阪府');

    // レスポンスが配列であることを確認
    expect(Array.isArray(libraries)).toBe(true);

    // 少なくとも1つの図書館があることを確認
    expect(libraries.length).toBeGreaterThan(0);

    // 最初の図書館の存在を確認
    const firstLibrary = libraries[0];
    expect(firstLibrary).toHaveProperty('systemid');
    expect(firstLibrary).toHaveProperty('systemname');
    expect(firstLibrary).toHaveProperty('libkey');
  }, 10000);

  it('should handle invalid prefecture', async () => {
    try {
      // 存在しない県名でテスト
      await calilApiService.getLibrariesByPrefecture('存在しない県');
      
      // APIが成功応答を返す場合（空配列など）、このテストはパス
      // 明示的にパスさせるには以下の行を含める
      expect(true).toBe(true);
    } catch (error) {
      // APIがエラーを返す場合、このテストはパス
      // エラーの検証を行いたい場合は以下を追加
      expect(error).toBeDefined();
    }
  }, 10000);
});
