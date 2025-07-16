// 共通設定管理
import { 
  GeminiAnalysisConfig, 
  ImageAnalysisOptions,
  PerformanceConfig,
  GeminiAnalysisConfigSchema,
  ImageAnalysisOptionsSchema,
  PerformanceConfigSchema
} from '../types.js';
import { 
  loadGeminiConfigFromEnv, 
  loadPerformanceConfigFromEnv,
  validateEnvironment 
} from '../utils/env.js';
import { 
  DEFAULT_GEMINI_CONFIG, 
  DEFAULT_PERFORMANCE_CONFIG,
  DEFAULT_ANALYSIS_OPTIONS,
  DEFAULT_MAX_CONCURRENT_REQUESTS
} from '../constants/defaults.js';

/**
 * 統合設定管理クラス
 */
export class ConfigManager {
  private geminiConfig: GeminiAnalysisConfig;
  private performanceConfig: PerformanceConfig;
  private readonly defaultAnalysisOptions: ImageAnalysisOptions;

  constructor() {
    // 環境変数から設定を読み込み
    const envGeminiConfig = loadGeminiConfigFromEnv();
    const envPerformanceConfig = loadPerformanceConfigFromEnv();

    // バリデーション
    this.geminiConfig = GeminiAnalysisConfigSchema.parse(envGeminiConfig);
    this.performanceConfig = PerformanceConfigSchema.parse({
      ...DEFAULT_PERFORMANCE_CONFIG,
      ...envPerformanceConfig
    });
    this.defaultAnalysisOptions = ImageAnalysisOptionsSchema.parse(DEFAULT_ANALYSIS_OPTIONS);

    // 環境変数の妥当性チェック
    const validation = validateEnvironment();
    if (!validation.valid) {
      console.warn('Environment validation warnings:', validation.errors);
    }
  }

  /**
   * Gemini設定を取得
   */
  getGeminiConfig(): GeminiAnalysisConfig {
    return { ...this.geminiConfig };
  }

  /**
   * Gemini設定を更新
   */
  updateGeminiConfig(newConfig: Partial<GeminiAnalysisConfig>): void {
    const mergedConfig = { ...this.geminiConfig, ...newConfig };
    this.geminiConfig = GeminiAnalysisConfigSchema.parse(mergedConfig);
  }

  /**
   * パフォーマンス設定を取得
   */
  getPerformanceConfig(): PerformanceConfig {
    return { ...this.performanceConfig };
  }

  /**
   * パフォーマンス設定を更新
   */
  updatePerformanceConfig(newConfig: Partial<PerformanceConfig>): void {
    const mergedConfig = { ...this.performanceConfig, ...newConfig };
    this.performanceConfig = PerformanceConfigSchema.parse(mergedConfig);
  }

  /**
   * デフォルトの分析オプションを取得
   */
  getDefaultAnalysisOptions(): ImageAnalysisOptions {
    return { ...this.defaultAnalysisOptions };
  }

  /**
   * 分析オプションをマージ
   */
  mergeAnalysisOptions(options: Partial<ImageAnalysisOptions>): ImageAnalysisOptions {
    return { ...this.defaultAnalysisOptions, ...options };
  }

  /**
   * 最大画像サイズをバイト単位で取得
   */
  getMaxImageSizeBytes(): number {
    return this.performanceConfig.maxImageSize * 1024 * 1024;
  }

  /**
   * 分析タイムアウトをミリ秒単位で取得
   */
  getAnalysisTimeoutMs(): number {
    return this.performanceConfig.analysisTimeout * 1000;
  }

  /**
   * 最大並行リクエスト数を取得
   */
  getMaxConcurrentRequests(): number {
    return DEFAULT_MAX_CONCURRENT_REQUESTS;
  }

  /**
   * 設定の要約を取得（デバッグ用）
   */
  getSummary() {
    return {
      gemini: this.geminiConfig,
      performance: this.performanceConfig,
      defaultAnalysisOptions: this.defaultAnalysisOptions,
      computed: {
        maxImageSizeBytes: this.getMaxImageSizeBytes(),
        analysisTimeoutMs: this.getAnalysisTimeoutMs(),
        maxConcurrentRequests: this.getMaxConcurrentRequests()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 設定をリセット（環境変数から再読み込み）
   */
  reset(): void {
    const envGeminiConfig = loadGeminiConfigFromEnv();
    const envPerformanceConfig = loadPerformanceConfigFromEnv();

    this.geminiConfig = GeminiAnalysisConfigSchema.parse(envGeminiConfig);
    this.performanceConfig = PerformanceConfigSchema.parse({
      ...DEFAULT_PERFORMANCE_CONFIG,
      ...envPerformanceConfig
    });
  }

  /**
   * 設定の妥当性をチェック
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Gemini設定のチェック
    try {
      GeminiAnalysisConfigSchema.parse(this.geminiConfig);
    } catch (error) {
      errors.push(`Invalid Gemini config: ${error}`);
    }

    // パフォーマンス設定のチェック
    try {
      PerformanceConfigSchema.parse(this.performanceConfig);
    } catch (error) {
      errors.push(`Invalid performance config: ${error}`);
    }

    // 環境変数のチェック
    const envValidation = validateEnvironment();
    errors.push(...envValidation.errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * グローバル設定インスタンス（シングルトン）
 */
let globalConfigManager: ConfigManager | null = null;

/**
 * グローバル設定マネージャーを取得
 */
export const getConfigManager = (): ConfigManager => {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager();
  }
  return globalConfigManager;
};

/**
 * グローバル設定を初期化（テスト用）
 */
export const resetConfigManager = (): void => {
  globalConfigManager = null;
};

/**
 * 便利な設定取得関数群
 */
export const getGeminiConfig = (): GeminiAnalysisConfig => {
  return getConfigManager().getGeminiConfig();
};

export const getPerformanceConfig = (): PerformanceConfig => {
  return getConfigManager().getPerformanceConfig();
};

export const getDefaultAnalysisOptions = (): ImageAnalysisOptions => {
  return getConfigManager().getDefaultAnalysisOptions();
};

export const getMaxImageSizeBytes = (): number => {
  return getConfigManager().getMaxImageSizeBytes();
};

export const getAnalysisTimeoutMs = (): number => {
  return getConfigManager().getAnalysisTimeoutMs();
};

export const getMaxConcurrentRequests = (): number => {
  return getConfigManager().getMaxConcurrentRequests();
};