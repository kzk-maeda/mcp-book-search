#!/usr/bin/env node

/**
 * MCP Book Search Server - 接続テスト
 * 
 * このスクリプトは以下をテストします：
 * 1. MCP book-searchサーバーへの接続
 * 2. ツール一覧の取得
 * 3. 基本的なツール呼び出し（get_libraries_by_prefectureとsearch_books）
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modulesでは__dirnameが使えないため、同等の機能を実装
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MCP JSONRPCメッセージを作成する関数
function createJsonRpcMessage(method, params, id = '1') {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params
  });
}

// サーバープロセスを開始する関数
function startServer() {
  console.log('MCP book-searchサーバーを起動しています...');
  
  const serverProcess = spawn('node', [
    path.resolve(__dirname, '../dist/index.js')
  ], {
    env: {
      ...process.env,
      CALIL_APPLICATION_KEY: process.env.CALIL_APPLICATION_KEY
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (data) => {
    // サーバーからの標準出力を処理
    const output = data.toString().trim();
    if (output) console.log(`サーバー出力: ${output}`);
  });

  serverProcess.stderr.on('data', (data) => {
    // サーバーからのエラー出力を処理
    const errorOutput = data.toString().trim();
    if (errorOutput) console.log(`サーバーエラー: ${errorOutput}`);
  });

  return serverProcess;
}

// メインのテスト関数
async function runTests() {
  console.log('MCP book-search接続テストを開始します...');

  try {
    // サーバーを起動
    const serverProcess = startServer();
    
    // サーバーが起動するまで少し待つ
    console.log('サーバーの起動を待っています...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 標準入出力を使ってJSONRPC通信
    console.log('\n--- ツール一覧を取得しています ---');
    const listToolsMessage = createJsonRpcMessage('tools/list', {});
    
    serverProcess.stdin.write(listToolsMessage + '\n');
    
    // レスポンスを処理する関数
    const processResponse = (data) => {
      const responseStr = data.toString().trim();
      if (!responseStr) return;
      
      try {
        const response = JSON.parse(responseStr);
        console.log('受信したレスポンス:', JSON.stringify(response, null, 2));
        return response;
      } catch (e) {
        console.error('JSONの解析に失敗しました:', responseStr);
      }
    };
    
    // 標準出力からレスポンスを読み取る
    serverProcess.stdout.on('data', processResponse);
    
    // ツール一覧のレスポンスを待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n--- 都道府県の図書館を取得します ---');
    const getLibrariesMessage = createJsonRpcMessage('tools/call', {
      name: 'get_libraries_by_prefecture',
      arguments: {
        prefecture: '千葉県'
      }
    }, '2');
    
    serverProcess.stdin.write(getLibrariesMessage + '\n');
    
    // レスポンスを待つ
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n--- 書籍検索を実行します ---');
    const searchBooksMessage = createJsonRpcMessage('tools/call', {
      name: 'search_books',
      arguments: {
        query: 'ISBN:4299062647',
        prefecture: '千葉県',
        city: '千葉市',
        isbn: '4299062647'
      }
    }, '3');
    
    serverProcess.stdin.write(searchBooksMessage + '\n');
    
    // レスポンスを待つ
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\nすべてのテストが完了しました。サーバーを停止します...');
    serverProcess.kill();
    
    console.log('テスト成功: MCPサーバーは正常に動作しています');
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// テストを実行
runTests().catch(err => {
  console.error('致命的なエラー:', err);
  process.exit(1);
});
