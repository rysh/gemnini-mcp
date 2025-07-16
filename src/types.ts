// 型定義ファイル
import { z } from 'zod';

// Gemini分析設定スキーマ
export const GeminiAnalysisConfigSchema = z.object({
  model: z.string().default('gemini-2.5-pro'),
  temperature: z.number().min(0).max(1).default(0.7),
  maxOutputTokens: z.number().positive().default(2048),
  language: z.enum(['ja', 'en', 'auto']).default('ja'),
});

export type GeminiAnalysisConfig = z.infer<typeof GeminiAnalysisConfigSchema>;

// 画像解析オプションスキーマ
export const ImageAnalysisOptionsSchema = z.object({
  analysisType: z.enum(['describe', 'ocr', 'classify', 'detect_objects']).default('describe'),
  detailLevel: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  includeConfidence: z.boolean().default(false),
  extractColors: z.boolean().default(false),
  detectFaces: z.boolean().default(false),
  readQRCodes: z.boolean().default(false),
  includeMetadata: z.boolean().default(false),
});

export type ImageAnalysisOptions = z.infer<typeof ImageAnalysisOptionsSchema>;

// パフォーマンス設定スキーマ
export const PerformanceConfigSchema = z.object({
  maxImageSize: z.number().positive().default(10), // MB
  maxBatchSize: z.number().positive().default(10),
  parallelProcessing: z.boolean().default(true),
  analysisTimeout: z.number().positive().default(30), // seconds
  cacheResults: z.boolean().default(true),
});

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

// 画像メタデータ型
export interface ImageMetadata {
  filename: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  exif?: Record<string, unknown>;
}

// 色情報型
export interface ColorInfo {
  color: string;
  percentage: number;
  rgb: [number, number, number];
}

// 分析結果型
export interface AnalysisResult {
  description: string;
  objects: string[];
  text: string;
  metadata: ImageMetadata;
  confidence: number;
  colors: ColorInfo[];
  processingTime: number;
}

// エラー型
export enum ErrorCode {
  GEMINI_AUTH_ERROR = 'GEMINI_AUTH_ERROR',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export class GeminiMCPError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GeminiMCPError';
  }
}

// MCP ツールパラメーター型
export const AnalyzeImageToolSchema = z.object({
  image_path: z.string(),
  analysis_type: ImageAnalysisOptionsSchema.shape.analysisType.optional(),
  detail_level: ImageAnalysisOptionsSchema.shape.detailLevel.optional(),
  language: GeminiAnalysisConfigSchema.shape.language.optional(),
  model: GeminiAnalysisConfigSchema.shape.model.optional(),
  temperature: GeminiAnalysisConfigSchema.shape.temperature.optional(),
});

export type AnalyzeImageToolParams = z.infer<typeof AnalyzeImageToolSchema>;

export const BatchProcessImagesToolSchema = z.object({
  directory_path: z.string(),
  file_pattern: z.string().optional(),
  analysis_options: ImageAnalysisOptionsSchema.optional(),
  max_files: z.number().positive().optional(),
});

export type BatchProcessImagesToolParams = z.infer<typeof BatchProcessImagesToolSchema>;

export const ConfigureGeminiSettingsToolSchema = z.object({
  model: GeminiAnalysisConfigSchema.shape.model.optional(),
  temperature: GeminiAnalysisConfigSchema.shape.temperature.optional(),
  language: GeminiAnalysisConfigSchema.shape.language.optional(),
  max_tokens: GeminiAnalysisConfigSchema.shape.maxOutputTokens.optional(),
});

export type ConfigureGeminiSettingsToolParams = z.infer<typeof ConfigureGeminiSettingsToolSchema>;