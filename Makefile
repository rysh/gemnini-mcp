# Makefile for Gemini MCP
# mise未対応環境用のフォールバック

.PHONY: help install dev build test test-watch test-coverage typecheck lint lint-fix clean start check ci setup mcp-register mcp-unregister mcp-list mcp-test debug-verbose gemini-auth gemini-test pre-commit pre-push

# デフォルトターゲット
help: ## ヘルプを表示
	@echo "Gemini MCP 開発コマンド"
	@echo ""
	@echo "基本コマンド:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "推奨: mise がインストールされている場合は 'mise run <タスク名>' を使用してください"

# 基本開発タスク
install: ## 依存関係をインストール
	npm ci

dev: install ## 開発モードでサーバー起動
	npx tsx watch src/mcp-server.ts

build: install ## TypeScriptをビルド
	npx tsc

test: install ## テストを実行
	npx jest

test-watch: install ## ウォッチモードでテスト実行
	npx jest --watch

test-coverage: install ## カバレッジ付きテスト実行
	npx jest --coverage

typecheck: install ## TypeScript型チェック
	npx tsc --noEmit

lint: install ## ESLintでコード検証
	npx eslint src/**/*.ts tests/**/*.ts

lint-fix: install ## ESLintで自動修正
	npx eslint src/**/*.ts tests/**/*.ts --fix

clean: ## ビルド成果物を削除
	rm -rf dist coverage .jest

start: build ## ビルド済みサーバーを起動
	node dist/mcp-server.js

# 統合タスク
check: install ## 全品質チェックを実行
	@echo "🔍 型チェック実行中..."
	$(MAKE) typecheck
	@echo "✅ 型チェック完了"
	@echo ""
	@echo "🔍 リント実行中..."
	$(MAKE) lint
	@echo "✅ リント完了"
	@echo ""
	@echo "🔍 テスト実行中..."
	$(MAKE) test-coverage
	@echo "✅ 全チェック完了"

ci: ## CI環境での全チェック
	npm ci
	$(MAKE) typecheck
	$(MAKE) lint
	$(MAKE) test-coverage
	$(MAKE) build
	@echo "✅ CI チェック完了"

setup: ## 初回セットアップ
	@echo "🚀 初回セットアップ開始..."
	npm ci
	@echo "📦 依存関係インストール完了"
	@npx @google-ai/generative-ai-cli --help > /dev/null 2>&1 || echo "⚠️  Gemini CLI が見つかりません。個別にインストールしてください。"
	@echo "✅ セットアップ完了"

# MCP関連タスク
mcp-register: install ## Claude CodeにMCPサーバーを登録
	claude mcp add gemini-image-analyzer npx tsx src/mcp-server.ts

mcp-unregister: ## Claude CodeからMCPサーバーを削除
	claude mcp remove gemini-image-analyzer

mcp-list: ## 登録済みMCPサーバー一覧
	claude mcp list

mcp-test: install ## MCPサーバー単体テスト
	npx tsx src/mcp-server.ts --test

# デバッグ・開発支援タスク
debug-verbose: install ## 詳細ログでサーバー起動
	DEBUG=gemini-mcp:* LOG_LEVEL=debug npx tsx src/mcp-server.ts

gemini-auth: ## Gemini CLI認証設定
	npx @google-ai/generative-ai-cli --prompt 'テスト認証'

gemini-test: ## Gemini CLI動作テスト
	npx @google-ai/generative-ai-cli --prompt 'Hello from Makefile!'

# Git hooks風
pre-commit: ## コミット前チェック
	@echo "🔧 自動修正実行中..."
	$(MAKE) lint-fix
	@echo "🔍 型チェック実行中..."
	$(MAKE) typecheck
	@echo "🧪 テスト実行中..."
	$(MAKE) test
	@echo "✅ コミット前チェック完了"

pre-push: ## プッシュ前チェック
	@echo "🔍 全品質チェック実行中..."
	$(MAKE) check
	@echo "🏗️  ビルド実行中..."
	$(MAKE) build
	@echo "✅ プッシュ前チェック完了"

# 環境情報
info: ## 環境情報を表示
	@echo "Environment Information:"
	@echo "Node.js: $$(node --version)"
	@echo "npm: $$(npm --version)"
	@echo "TypeScript: $$(npx tsc --version 2>/dev/null || echo 'Not installed')"
	@echo "Jest: $$(npx jest --version 2>/dev/null || echo 'Not installed')"
	@echo "ESLint: $$(npx eslint --version 2>/dev/null || echo 'Not installed')"
	@echo "Claude Code: $$(claude --version 2>/dev/null || echo 'Not installed')"
	@echo "Gemini CLI: $$(npx @google-ai/generative-ai-cli --version 2>/dev/null || echo 'Not installed')"

# 高速開発用ショートカット
q: typecheck ## クイック型チェック（短縮コマンド）
t: test ## クイックテスト（短縮コマンド）
l: lint ## クイックリント（短縮コマンド）
c: check ## クイック全チェック（短縮コマンド）

# Docker用（将来的な拡張）
docker-build: ## Dockerイメージをビルド
	@echo "Docker対応は将来実装予定"

docker-run: ## Dockerコンテナを実行
	@echo "Docker対応は将来実装予定"