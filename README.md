# Gemini MCP for Claude Code

Claude Codeの画像解析機能を強化するGemini CLI連携MCPサーバー

## 🌟 概要

このプロジェクトは、Claude Codeの画像解析機能の制限を補完するため、Google Gemini CLIの強力な画像解析機能をModel Context Protocol (MCP)サーバーとして統合します。

### 主要機能

- **高精度画像分析**: Gemini 2.5 Proによる詳細な画像内容分析
- **多言語OCR**: 日本語・英語対応の文字認識
- **バッチ処理**: 複数画像の一括分析・処理
- **メタデータ抽出**: EXIF情報、画像プロパティの詳細取得
- **画像分類・タグ付け**: AI による自動カテゴリ分類
- **透過的統合**: Claude Code内で自然に利用可能

### メリット

- ✅ Claude Codeの画像解析精度を大幅向上
- ✅ 100万トークンの広大なコンテキストウィンドウ活用
- ✅ 最新Geminiモデルによる高性能分析
- ✅ ユーザー設定可能な詳細パラメーター
- ✅ Apache 2.0ライセンスのオープンソース

### 対応環境

- **Node.js**: 18以上
- **Claude Code**: 最新版
- **Gemini CLI**: インストール済み
- **OS**: macOS, Linux, Windows

## 📋 システム要件

| 項目 | 要件 |
|------|------|
| Node.js | >= 18.0.0 |
| Claude Code | 最新版推奨 |
| Gemini CLI | @google-ai/generative-ai-cli |
| メモリ | 512MB以上推奨 |
| ストレージ | 100MB以上 |

## 🚀 特徴

### 高度な画像解析
- オブジェクト検出・認識
- シーン理解と説明生成
- 感情・表情分析
- 画像品質評価

### 柔軟な設定オプション
- モデル選択 (Gemini 1.5 Pro/Flash, 2.5 Pro)
- 分析詳細度調整
- 言語設定 (日本語/英語/自動)
- パフォーマンス最適化設定

### シームレスな統合
- Claude Code内で透過的に動作
- 既存ワークフローに影響なし
- バックグラウンド自動処理

### 堅牢なアーキテクチャ
- **統一設定管理**: ConfigManagerによる一元化された設定制御
- **共通ユーティリティ**: ファイル操作・エラーハンドリング・バリデーションの標準化
- **型安全性**: TypeScript + Zodによる厳密な型チェック
- **テスト品質**: 100%成功のテストスイート

## 🚀 クイックスタート

### 前提条件

1. **Node.js 18以上**がインストールされていること
2. **Claude Code**が最新版にアップデートされていること
3. **Gemini CLI**がインストールされていること

```bash
# Gemini CLIのインストール
npx @google-ai/generative-ai-cli
```

### インストール手順

#### 1. プロジェクトクローン

```bash
git clone https://github.com/yourusername/gemnini-mcp.git
cd gemnini-mcp
```

#### 2. 依存関係インストール

```bash
npm install
```

#### 3. Gemini API認証

初回起動時にブラウザが開き、Googleアカウントでの認証が必要です：

```bash
npx @google-ai/generative-ai-cli --prompt "テスト"
```

#### 4. MCP設定

プロジェクトルートに `.mcp.json` を作成：

```json
{
  "mcpServers": {
    "gemini-image-analyzer": {
      "command": "npx",
      "args": ["tsx", "src/mcp-server.ts"],
      "env": {
        "GEMINI_MODEL": "gemini-2.5-pro",
        "MAX_IMAGE_SIZE": "10",
        "ANALYSIS_TIMEOUT": "30",
        "DEFAULT_LANGUAGE": "ja"
      }
    }
  }
}
```

#### 5. Claude Codeに登録

**miseを使用する場合（推奨）:**
```bash
mise run mcp:register
```

**Makefileを使用する場合:**
```bash
make mcp-register
```

**手動で登録する場合:**
```bash
claude mcp add gemini-image-analyzer npx tsx src/mcp-server.ts
```

### 動作確認

Claude Codeで以下のようにテストしてください：

```
画像を分析して詳細を教えて
```

画像ファイルをアップロードするか、パスを指定すると、Gemini CLIによる高精度分析が実行されます。

## 🛠️ 開発環境

### 推奨ツール

**mise（推奨）**
- モダンな開発ツール管理
- Node.jsバージョン自動管理
- タスクランナー統合

**Makefile**
- mise未対応環境での代替手段
- 従来のmakeコマンドで操作

### 開発環境セットアップ

#### Option 1: mise使用（推奨）

1. **miseのインストール**
   ```bash
   # macOS (Homebrew)
   brew install mise
   
   # Linux/WSL
   curl https://mise.run | sh
   
   # その他の方法: https://mise.jdx.dev/getting-started.html
   ```

2. **プロジェクトセットアップ**
   ```bash
   cd gemnini-mcp
   mise install     # Node.js自動インストール
   mise run setup   # 依存関係インストール
   ```

3. **開発開始**
   ```bash
   mise run dev           # 開発サーバー起動
   mise run test:watch    # テストウォッチモード
   mise run check         # 全品質チェック
   ```

#### Option 2: Makefile使用

1. **Node.js 18+がインストール済みであることを確認**

2. **プロジェクトセットアップ**
   ```bash
   cd gemnini-mcp
   make setup       # 初回セットアップ
   ```

3. **開発開始**
   ```bash
   make dev         # 開発サーバー起動
   make test-watch  # テストウォッチモード
   make check       # 全品質チェック
   ```

### 利用可能なコマンド

#### 基本開発タスク

| mise | Makefile | 説明 |
|------|----------|------|
| `mise run dev` | `make dev` | 開発サーバー起動 |
| `mise run test` | `make test` | テスト実行 |
| `mise run test:watch` | `make test-watch` | テストウォッチモード |
| `mise run test:coverage` | `make test-coverage` | カバレッジ付きテスト |
| `mise run build` | `make build` | ビルド実行 |
| `mise run typecheck` | `make typecheck` | 型チェック |
| `mise run lint` | `make lint` | リント実行 |
| `mise run lint:fix` | `make lint-fix` | リント自動修正 |

#### 統合・品質チェック

| mise | Makefile | 説明 |
|------|----------|------|
| `mise run check` | `make check` | 全品質チェック |
| `mise run ci` | `make ci` | CI相当のチェック |
| `mise run pre-commit` | `make pre-commit` | コミット前チェック |
| `mise run pre-push` | `make pre-push` | プッシュ前チェック |

#### MCP関連タスク

| mise | Makefile | 説明 |
|------|----------|------|
| `mise run mcp:register` | `make mcp-register` | Claude Codeに登録 |
| `mise run mcp:unregister` | `make mcp-unregister` | Claude Codeから削除 |
| `mise run mcp:list` | `make mcp-list` | 登録済みサーバー一覧 |
| `mise run mcp:test` | `make mcp-test` | MCPサーバーテスト |

#### Gemini関連

| mise | Makefile | 説明 |
|------|----------|------|
| `mise run gemini:auth` | `make gemini-auth` | Gemini CLI認証 |
| `mise run gemini:test` | `make gemini-test` | Gemini CLI動作確認 |

#### ショートカット（Makefile専用）

| コマンド | 説明 |
|----------|------|
| `make q` | クイック型チェック |
| `make t` | クイックテスト |
| `make l` | クイックリント |
| `make c` | クイック全チェック |

### 推奨開発フロー

1. **機能開発前**
   ```bash
   # mise使用
   mise run typecheck && mise run test
   
   # Makefile使用
   make q && make t
   ```

2. **開発中**
   ```bash
   # 別ターミナルでウォッチモード
   mise run test:watch  # または make test-watch
   
   # メインターミナルで開発
   mise run dev         # または make dev
   ```

3. **コミット前**
   ```bash
   mise run pre-commit  # または make pre-commit
   ```

4. **プッシュ前**
   ```bash
   mise run pre-push    # または make pre-push
   ```

## 🏗️ アーキテクチャ

### コードアーキテクチャ概要

```
src/
├── mcp-server.ts          # MCPサーバーメイン
├── gemini-client.ts       # Gemini CLI連携
├── types.ts               # 型定義
├── config/
│   └── index.ts          # 統一設定管理 (ConfigManager)
├── utils/
│   ├── env.ts            # 環境変数読み取り
│   ├── error-handling.ts # エラーハンドリング統一
│   ├── file.ts           # ファイル操作ユーティリティ
│   └── image-validation.ts # 画像検証ユーティリティ
└── constants/
    └── defaults.ts       # デフォルト値一元管理
```

### 主要コンポーネント

#### ConfigManager (`src/config/index.ts`)
- **目的**: 設定の一元管理とバリデーション
- **機能**: 環境変数読み込み、設定検証、シングルトンパターン
- **メリット**: 設定変更時の影響範囲を最小化

```typescript
import { getConfigManager } from './config/index.js';

const config = getConfigManager();
const maxSize = config.getMaxImageSizeBytes();
const timeout = config.getAnalysisTimeoutMs();
```

#### エラーハンドリング (`src/utils/error-handling.ts`)
- **統一エラーレスポンス**: `createErrorResponse()`, `createSuccessResponse()`
- **エラーファクトリー**: `createGeminiErrors.*` で一貫したエラー生成
- **高階関数**: `withErrorHandling()` でツールハンドラーをラップ

#### ファイル操作 (`src/utils/file.ts`)
- **画像ファイルバリデーション**: サイズ、形式、存在確認
- **メタデータ抽出**: 安全な画像情報取得
- **ディレクトリ操作**: バッチ処理用ファイル検索

#### 画像検証 (`src/utils/image-validation.ts`)
- **品質評価**: 画像の適性自動判定
- **パフォーマンス予測**: 処理時間見積もり
- **推奨設定**: 最適化提案の自動生成

### 設計原則

1. **関数型プログラミング**: 副作用を最小限に抑制
2. **単一責任原則**: 各モジュールが明確な役割を持つ
3. **型安全性**: TypeScript + Zodで厳密な型チェック
4. **テスタビリティ**: ユニットテストしやすい構造
5. **保守性**: 設定変更やライブラリ更新に強い設計

## ⚙️ 詳細設定

### Geminiモデル設定

利用可能なモデルと特徴：

| モデル | 特徴 | 用途 | 速度 | コスト |
|--------|------|------|------|--------|
| gemini-2.5-pro | 最高精度 | 詳細分析・研究用 | 中 | 高 |
| gemini-2.0-flash-exp | バランス型 | 一般用途 | 高 | 中 |
| gemini-1.5-pro | 安定版 | 本番環境 | 中 | 中 |
| gemini-1.5-flash | 高速 | 大量処理 | 最高 | 低 |

### 環境変数設定

プロジェクトで使用される環境変数とデフォルト値：

#### Gemini設定
```bash
export GEMINI_MODEL="gemini-2.5-pro"          # デフォルト: gemini-2.5-pro
export GEMINI_TEMPERATURE="0.7"               # デフォルト: 0.7
export GEMINI_MAX_TOKENS="2048"               # デフォルト: 2048
export GEMINI_LANGUAGE="ja"                   # デフォルト: ja
```

#### パフォーマンス設定
```bash
export MAX_IMAGE_SIZE="10"                    # デフォルト: 10 (MB)
export ANALYSIS_TIMEOUT="30"                  # デフォルト: 30 (秒)
export MAX_CONCURRENT_REQUESTS="3"            # デフォルト: 3
export DEFAULT_LANGUAGE="ja"                  # デフォルト: ja
```

#### 設定管理の特徴
- **自動バリデーション**: 不正な値は警告と共にデフォルト値を使用
- **型安全性**: 数値・列挙型の厳密チェック
- **デフォルト値**: 全設定にフォールバック値を提供
- **動的更新**: 実行時設定変更をサポート

### パラメーター詳細設定

#### 基本パラメーター

```typescript
interface GeminiAnalysisConfig {
  model: string;           // 使用モデル
  temperature: number;     // 0.0-1.0 (創造性レベル)
  maxOutputTokens: number; // 最大出力トークン数
  language: string;        // 出力言語 ('ja', 'en', 'auto')
}
```

#### 画像解析オプション

```typescript
interface ImageAnalysisOptions {
  analysisType: 'describe' | 'ocr' | 'classify' | 'detect_objects';
  detailLevel: 'brief' | 'standard' | 'detailed';
  includeConfidence: boolean;    // 信頼度スコア含める
  extractColors: boolean;        // 色情報抽出
  detectFaces: boolean;          // 顔検出
  readQRCodes: boolean;          // QRコード読み取り
  includeMetadata: boolean;      // メタデータ含める
}
```

#### パフォーマンス設定

```typescript
interface PerformanceConfig {
  maxImageSize: number;      // MB単位
  maxBatchSize: number;      // 一度に処理する画像数
  parallelProcessing: boolean;
  analysisTimeout: number;   // 秒単位
  cacheResults: boolean;     // 結果キャッシュ
}
```

## 📖 使用例

### 基本的な画像分析

```typescript
// Claude Codeでの使用例
"この画像に何が写っているか詳しく教えて"
```

自動的に以下のようなMCPツール呼び出しが実行されます：

```json
{
  "tool": "analyze_image_with_gemini",
  "parameters": {
    "image_path": "/path/to/image.jpg",
    "analysis_type": "describe",
    "detail_level": "detailed",
    "language": "ja"
  }
}
```

### OCR（文字認識）

```typescript
"このスクリーンショットから文字を抽出して"
```

### バッチ処理

```typescript
"フォルダ内の全画像を分析して分類して"
```

### カスタム設定での分析

```typescript
"高精度モデルで英語で分析して、メタデータも含めて"
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. Gemini CLI認証エラー

**症状**: `Authentication failed` エラー

**解決方法**:
```bash
# 認証情報をリセット
rm -rf ~/.config/@google-ai/generative-ai-cli
npx @google-ai/generative-ai-cli --prompt "テスト"
```

#### 2. MCPサーバー接続エラー

**症状**: Claude CodeでMCPツールが利用できない

**解決方法**:
```bash
# MCP設定確認
claude mcp list

# サーバー再起動
claude mcp remove gemini-image-analyzer
claude mcp add gemini-image-analyzer npx tsx src/mcp-server.ts
```

#### 3. 画像サイズエラー

**症状**: `Image too large` エラー

**解決方法**:
- 環境変数で最大サイズを増加: `export MAX_IMAGE_SIZE=20`
- 画像を事前リサイズしてから分析

#### 4. タイムアウトエラー

**症状**: 分析が途中で止まる

**解決方法**:
```bash
# タイムアウト時間を延長
export ANALYSIS_TIMEOUT=60
```

#### 5. 日本語出力が文字化け

**症状**: 日本語が正しく表示されない

**解決方法**:
```bash
# 言語設定を明示的に指定
export GEMINI_LANGUAGE=ja
export LANG=ja_JP.UTF-8
```

### デバッグ方法

#### ログレベル設定

```bash
# 詳細ログを有効化
export DEBUG=gemini-mcp:*
export LOG_LEVEL=debug
```

#### 手動テスト

```bash
# Gemini CLI直接テスト
npx @google-ai/generative-ai-cli --prompt "画像を分析" --file path/to/image.jpg

# MCPサーバー単体テスト
npx tsx src/mcp-server.ts --test
```

### パフォーマンス最適化

#### メモリ使用量削減

```bash
# Node.jsメモリ制限
export NODE_OPTIONS="--max-old-space-size=2048"
```

#### バッチ処理最適化

```typescript
// 並行処理数を調整
export MAX_CONCURRENT_REQUESTS=3
export BATCH_SIZE=5
```

## 📚 APIリファレンス

### 利用可能ツール

#### 1. `analyze_image_with_gemini`

**説明**: 単一画像の詳細分析

**パラメーター**:
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `image_path` | string | ✅ | 画像ファイルのパス |
| `analysis_type` | enum | ❌ | 分析タイプ (`describe`, `ocr`, `classify`, `detect_objects`) |
| `detail_level` | enum | ❌ | 詳細度 (`brief`, `standard`, `detailed`) |
| `language` | string | ❌ | 出力言語 (`ja`, `en`, `auto`) |
| `model` | string | ❌ | 使用モデル |
| `temperature` | number | ❌ | 創造性レベル (0.0-1.0) |

**レスポンス**:
```typescript
interface AnalysisResult {
  description: string;          // 画像説明
  objects: string[];           // 検出されたオブジェクト
  text: string;               // OCR結果
  metadata: ImageMetadata;     // 画像メタデータ
  confidence: number;          // 信頼度スコア
  colors: ColorInfo[];        // 主要色情報
}
```

#### 2. `batch_process_images`

**説明**: 複数画像の一括処理

**パラメーター**:
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `directory_path` | string | ✅ | 画像ディレクトリパス |
| `file_pattern` | string | ❌ | ファイルパターン (例: `*.jpg`) |
| `analysis_options` | object | ❌ | 分析オプション |
| `max_files` | number | ❌ | 最大処理ファイル数 |

#### 3. `configure_gemini_settings`

**説明**: Gemini設定の動的変更

**パラメーター**:
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `model` | string | ❌ | デフォルトモデル |
| `temperature` | number | ❌ | デフォルト温度 |
| `language` | string | ❌ | デフォルト言語 |
| `max_tokens` | number | ❌ | 最大トークン数 |

### エラーコード

| コード | 説明 | 対処法 |
|--------|------|--------|
| `GEMINI_AUTH_ERROR` | 認証失敗 | 認証情報を再設定 |
| `IMAGE_TOO_LARGE` | 画像サイズ超過 | 画像を圧縮またはサイズ制限を増加 |
| `ANALYSIS_TIMEOUT` | 分析タイムアウト | タイムアウト時間を延長 |
| `INVALID_IMAGE_FORMAT` | 非対応形式 | 対応形式に変換 |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 | 待機してから再試行 |

## 🤝 コントリビューション

### 開発環境セットアップ

```bash
# リポジトリをフォーク後
git clone https://github.com/yourusername/gemnini-mcp.git
cd gemnini-mcp

# 開発依存関係インストール
npm install

# テスト実行
npm test

# 型チェック
npm run typecheck

# リント実行
npm run lint
```

### プルリクエストガイドライン

1. 機能追加前にIssueで相談
2. テストケースを追加
3. ドキュメントを更新
4. コミットメッセージは明確に記述
5. 拡張TDD (Red→Green→Refactor→Document→Commit) に従う

## 📄 ライセンス

Apache License 2.0 - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

🚀 **Claude Codeの画像解析能力を次のレベルへ！**

質問や提案がありましたら、[Issues](https://github.com/yourusername/gemnini-mcp/issues) でお気軽にお知らせください。