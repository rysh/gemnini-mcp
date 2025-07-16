// 環境変数読み取りユーティリティ
import { 
  DEFAULT_GEMINI_CONFIG, 
  DEFAULT_PERFORMANCE_CONFIG, 
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  ENV_KEYS,
  SUPPORTED_LANGUAGES,
  AVAILABLE_GEMINI_MODELS
} from '../constants/defaults.js';

/**
 * 環境変数から文字列値を取得（デフォルト値付き）
 */
export const getEnvString = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

/**
 * 環境変数から数値を取得（デフォルト値付き）
 */
export const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  
  const parsed = Number(value);
  if (isNaN(parsed)) {
    console.warn(`Invalid number value for ${key}: ${value}. Using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return parsed;
};

/**
 * 環境変数から真偽値を取得（デフォルト値付き）
 */
export const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  
  const lowerValue = value.toLowerCase();
  return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
};

/**
 * 環境変数から列挙型の値を取得（バリデーション付き）
 */
export const getEnvEnum = <T extends readonly string[]>(
  key: string, 
  allowedValues: T, 
  defaultValue: T[number]
): T[number] => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  
  if (allowedValues.includes(value as T[number])) {
    return value as T[number];
  }
  
  console.warn(`Invalid enum value for ${key}: ${value}. Allowed: ${allowedValues.join(', ')}. Using default: ${defaultValue}`);
  return defaultValue;
};

/**
 * Gemini設定を環境変数から読み込み
 */
export const loadGeminiConfigFromEnv = () => {
  return {
    model: getEnvEnum(
      ENV_KEYS.GEMINI_MODEL, 
      AVAILABLE_GEMINI_MODELS, 
      DEFAULT_GEMINI_CONFIG.model
    ),
    temperature: getEnvNumber(
      ENV_KEYS.GEMINI_TEMPERATURE, 
      DEFAULT_GEMINI_CONFIG.temperature
    ),
    maxOutputTokens: getEnvNumber(
      ENV_KEYS.GEMINI_MAX_TOKENS, 
      DEFAULT_GEMINI_CONFIG.maxOutputTokens
    ),
    language: getEnvEnum(
      ENV_KEYS.GEMINI_LANGUAGE, 
      SUPPORTED_LANGUAGES, 
      DEFAULT_GEMINI_CONFIG.language
    ),
  };
};

/**
 * パフォーマンス設定を環境変数から読み込み
 */
export const loadPerformanceConfigFromEnv = () => {
  return {
    maxImageSize: getEnvNumber(
      ENV_KEYS.MAX_IMAGE_SIZE, 
      DEFAULT_PERFORMANCE_CONFIG.maxImageSize
    ),
    analysisTimeout: getEnvNumber(
      ENV_KEYS.ANALYSIS_TIMEOUT, 
      DEFAULT_PERFORMANCE_CONFIG.analysisTimeout
    ),
    maxConcurrentRequests: getEnvNumber(
      ENV_KEYS.MAX_CONCURRENT_REQUESTS, 
      DEFAULT_MAX_CONCURRENT_REQUESTS
    ),
  };
};

/**
 * 環境変数の妥当性をチェック
 */
export const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Gemini設定の妥当性チェック
  const temperature = getEnvNumber(ENV_KEYS.GEMINI_TEMPERATURE, DEFAULT_GEMINI_CONFIG.temperature);
  if (temperature < 0 || temperature > 1) {
    errors.push(`${ENV_KEYS.GEMINI_TEMPERATURE} must be between 0 and 1, got: ${temperature}`);
  }
  
  const maxTokens = getEnvNumber(ENV_KEYS.GEMINI_MAX_TOKENS, DEFAULT_GEMINI_CONFIG.maxOutputTokens);
  if (maxTokens <= 0) {
    errors.push(`${ENV_KEYS.GEMINI_MAX_TOKENS} must be positive, got: ${maxTokens}`);
  }
  
  // パフォーマンス設定の妥当性チェック
  const maxImageSize = getEnvNumber(ENV_KEYS.MAX_IMAGE_SIZE, DEFAULT_PERFORMANCE_CONFIG.maxImageSize);
  if (maxImageSize <= 0) {
    errors.push(`${ENV_KEYS.MAX_IMAGE_SIZE} must be positive, got: ${maxImageSize}`);
  }
  
  const timeout = getEnvNumber(ENV_KEYS.ANALYSIS_TIMEOUT, DEFAULT_PERFORMANCE_CONFIG.analysisTimeout);
  if (timeout <= 0) {
    errors.push(`${ENV_KEYS.ANALYSIS_TIMEOUT} must be positive, got: ${timeout}`);
  }
  
  const concurrency = getEnvNumber(ENV_KEYS.MAX_CONCURRENT_REQUESTS, DEFAULT_MAX_CONCURRENT_REQUESTS);
  if (concurrency <= 0) {
    errors.push(`${ENV_KEYS.MAX_CONCURRENT_REQUESTS} must be positive, got: ${concurrency}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * 環境設定のサマリーを取得（デバッグ用）
 */
export const getEnvironmentSummary = () => {
  const geminiConfig = loadGeminiConfigFromEnv();
  const performanceConfig = loadPerformanceConfigFromEnv();
  const validation = validateEnvironment();
  
  return {
    gemini: geminiConfig,
    performance: performanceConfig,
    validation,
    nodeEnv: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
};