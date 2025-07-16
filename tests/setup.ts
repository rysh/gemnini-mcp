// テストセットアップファイル
import { jest } from '@jest/globals';

// グローバルモック設定
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// 環境変数のモック
process.env.NODE_ENV = 'test';
process.env.GEMINI_MODEL = 'gemini-2.5-pro';
process.env.MAX_IMAGE_SIZE = '10';
process.env.ANALYSIS_TIMEOUT = '30';
process.env.DEFAULT_LANGUAGE = 'ja';

// タイムアウト設定
jest.setTimeout(10000);