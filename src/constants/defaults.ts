// デフォルト値の一元管理
export const DEFAULT_GEMINI_CONFIG = {
  model: 'gemini-2.5-pro',
  temperature: 0.7,
  maxOutputTokens: 2048,
  language: 'ja' as const,
} as const;

export const DEFAULT_PERFORMANCE_CONFIG = {
  maxImageSize: 10, // MB
  maxBatchSize: 10,
  parallelProcessing: true,
  analysisTimeout: 30, // seconds
  cacheResults: true,
} as const;

// 別途定義（types.tsのPerformanceConfigには含まれていないため）
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 3;

export const DEFAULT_ANALYSIS_OPTIONS = {
  analysisType: 'describe' as const,
  detailLevel: 'standard' as const,
  includeConfidence: false,
  extractColors: false,
  detectFaces: false,
  readQRCodes: false,
  includeMetadata: false,
} as const;

// サポートされている画像形式
export const SUPPORTED_IMAGE_FORMATS = [
  '.jpg',
  '.jpeg', 
  '.png',
  '.webp',
  '.gif'
] as const;

// 環境変数キー
export const ENV_KEYS = {
  GEMINI_MODEL: 'GEMINI_MODEL',
  GEMINI_TEMPERATURE: 'GEMINI_TEMPERATURE',
  GEMINI_MAX_TOKENS: 'GEMINI_MAX_TOKENS',
  GEMINI_LANGUAGE: 'GEMINI_LANGUAGE',
  MAX_IMAGE_SIZE: 'MAX_IMAGE_SIZE',
  ANALYSIS_TIMEOUT: 'ANALYSIS_TIMEOUT',
  MAX_CONCURRENT_REQUESTS: 'MAX_CONCURRENT_REQUESTS',
  DEFAULT_LANGUAGE: 'DEFAULT_LANGUAGE',
} as const;

// デフォルト信頼度スコア
export const DEFAULT_CONFIDENCE_SCORE = 0.8;

// ファイルサイズ関連の定数
export const FILE_SIZE = {
  MB_TO_BYTES: 1024 * 1024,
  DEFAULT_MAX_IMAGE_SIZE_MB: 10,
} as const;

// タイムアウト関連の定数
export const TIMEOUT = {
  SECONDS_TO_MS: 1000,
  DEFAULT_ANALYSIS_TIMEOUT_SECONDS: 30,
} as const;

// 利用可能なGeminiモデル
export const AVAILABLE_GEMINI_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-pro'
] as const;

// サポートされている言語
export const SUPPORTED_LANGUAGES = ['ja', 'en', 'auto'] as const;

// 分析タイプ
export const ANALYSIS_TYPES = [
  'describe',
  'ocr', 
  'classify',
  'detect_objects'
] as const;

// 詳細度レベル
export const DETAIL_LEVELS = ['brief', 'standard', 'detailed'] as const;