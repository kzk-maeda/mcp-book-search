# 図書館検索 MCP サーバー

Calil API を利用した図書館検索のための MCP (Model Context Protocol) サーバーです。このサーバーを使用することで、Claude などのAIアシスタントが日本全国の図書館情報に直接アクセスできるようになります。

## 機能

- 都道府県名から図書館情報を検索
- 図書館名や所在地などの基本情報を取得
- AIアシスタントがツールとして利用可能

## 使用方法

### 前提条件

- Calil API キーの取得 (https://calil.jp/api/dashboard/)
- Node.js v16 以上

### ローカル実行

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
`.env`ファイルを作成し、以下の内容を追加：
```
CALIL_APPLICATION_KEY=あなたのCalilAPIキー
```

3. プロジェクトのビルド:
```bash
npm run build
```

4. サーバーの起動:
```bash
npm start
```

### Claude Desktop での設定

Claude Desktop の設定ファイル（通常は`~/.config/Claude Desktop/claude_desktop_config.json`）に以下のエントリを追加してください:

```json
{
  "mcpServers": {
    "book-search": {
      "command": "node",
      "args": [
        "/absolute/path/to/dist/index.js"
      ],
      "env": {
        "CALIL_APPLICATION_KEY": "あなたのCalilAPIキー"
      }
    }
  }
}
```

## 接続テスト

サーバーが正しく動作していることを確認するには、以下のコマンドを実行してください:

```bash
npm test
```

このテストでは以下の機能が検証されます:
- Calil API への接続
- 図書館情報の取得
- ツール呼び出しの処理

## 使用可能なツール

このMCPサーバーでは、以下のツールが利用可能です:

### `get_libraries_by_prefecture`

指定した都道府県内の図書館情報を検索します。

**引数**:
- `prefecture`: 都道府県名（例: 「東京都」「大阪府」）

**戻り値**:
都道府県内の図書館システムと図書館情報のリスト

### `search_books`

（現在はプレースホルダー実装）書籍を検索します。

**引数**:
- `query`: 検索キーワード

## 制限事項

- 現在、図書館情報の検索のみが実装されています
- 書籍検索機能は将来のバージョンで実装予定

## ライセンス

MIT
