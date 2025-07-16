// 画像検証ユーティリティ
import { SUPPORTED_IMAGE_FORMATS, DEFAULT_CONFIDENCE_SCORE } from '../constants/defaults.js';
import { createGeminiErrors } from './error-handling.js';
import { 
  isImageFile, 
  validateImageFile, 
  getFileExtension,
  getFileNameWithExtension 
} from './file.js';

/**
 * 画像形式のバリデーション結果
 */
export interface ImageValidationResult {
  isValid: boolean;
  format?: string;
  errors: string[];
  warnings: string[];
}

/**
 * 画像ファイルの基本バリデーション
 */
export const validateImageBasic = (filePath: string): ImageValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let format: string | undefined;

  // ファイルパスの基本チェック
  if (!filePath || typeof filePath !== 'string') {
    errors.push('ファイルパスが無効です');
    return { isValid: false, errors, warnings };
  }

  // 拡張子チェック
  const extension = getFileExtension(filePath);
  if (!extension) {
    errors.push('ファイル拡張子がありません');
  } else if (!SUPPORTED_IMAGE_FORMATS.includes(extension as any)) {
    errors.push(`サポートされていない画像形式: ${extension}`);
    warnings.push(`サポート形式: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`);
  } else {
    format = extension.slice(1); // ドットを除去
  }

  // ファイル名チェック
  const fileName = getFileNameWithExtension(filePath);
  if (fileName.length > 255) {
    warnings.push('ファイル名が長すぎます (255文字以下推奨)');
  }

  // 特殊文字チェック
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(fileName)) {
    warnings.push('ファイル名に特殊文字が含まれています');
  }

  return {
    isValid: errors.length === 0,
    format,
    errors,
    warnings
  };
};

/**
 * 複数画像ファイルのバリデーション
 */
export const validateImageFiles = (filePaths: string[]): {
  valid: string[];
  invalid: Array<{ path: string; result: ImageValidationResult }>;
  statistics: {
    total: number;
    valid: number;
    invalid: number;
    formats: Map<string, number>;
  };
} => {
  const valid: string[] = [];
  const invalid: Array<{ path: string; result: ImageValidationResult }> = [];
  const formats = new Map<string, number>();

  for (const filePath of filePaths) {
    const result = validateImageBasic(filePath);
    
    if (result.isValid) {
      valid.push(filePath);
      
      if (result.format) {
        const count = formats.get(result.format) || 0;
        formats.set(result.format, count + 1);
      }
    } else {
      invalid.push({ path: filePath, result });
    }
  }

  return {
    valid,
    invalid,
    statistics: {
      total: filePaths.length,
      valid: valid.length,
      invalid: invalid.length,
      formats
    }
  };
};

/**
 * バッチ処理用の画像ファイルフィルタリング
 */
export const filterValidImageFiles = (filePaths: string[]): {
  validFiles: string[];
  rejectedFiles: Array<{ path: string; reason: string }>;
} => {
  const validFiles: string[] = [];
  const rejectedFiles: Array<{ path: string; reason: string }> = [];

  for (const filePath of filePaths) {
    if (isImageFile(filePath)) {
      const validation = validateImageBasic(filePath);
      
      if (validation.isValid) {
        validFiles.push(filePath);
      } else {
        rejectedFiles.push({
          path: filePath,
          reason: validation.errors.join(', ')
        });
      }
    } else {
      rejectedFiles.push({
        path: filePath,
        reason: 'サポートされていない画像形式'
      });
    }
  }

  return { validFiles, rejectedFiles };
};

/**
 * 画像ファイルサイズの妥当性チェック
 */
export const validateImageFileSize = (sizeBytes: number, maxSizeBytes: number): {
  isValid: boolean;
  warning?: string;
  error?: string;
} => {
  if (sizeBytes > maxSizeBytes) {
    return {
      isValid: false,
      error: `ファイルサイズが上限を超えています: ${formatBytes(sizeBytes)} > ${formatBytes(maxSizeBytes)}`
    };
  }

  // 警告レベル (上限の80%以上)
  const warningThreshold = maxSizeBytes * 0.8;
  if (sizeBytes > warningThreshold) {
    return {
      isValid: true,
      warning: `ファイルサイズが大きいです: ${formatBytes(sizeBytes)} (上限: ${formatBytes(maxSizeBytes)})`
    };
  }

  return { isValid: true };
};

/**
 * バイト数を人間が読める形式に変換
 */
const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * 画像の推奨設定を取得
 */
export const getImageRecommendations = (filePath: string): {
  format: string;
  recommendations: string[];
  optimizations: string[];
} => {
  const extension = getFileExtension(filePath);
  const recommendations: string[] = [];
  const optimizations: string[] = [];

  switch (extension) {
    case '.jpg':
    case '.jpeg':
      recommendations.push('JPEG形式: 写真に最適');
      optimizations.push('品質80-90%で圧縮することを推奨');
      break;
    
    case '.png':
      recommendations.push('PNG形式: 透明度やシンプルな画像に最適');
      optimizations.push('不要な透明度チャンネルがある場合はJPEGへの変換を検討');
      break;
    
    case '.webp':
      recommendations.push('WebP形式: 高効率圧縮');
      optimizations.push('最も効率的な形式、そのまま使用推奨');
      break;
    
    case '.gif':
      recommendations.push('GIF形式: アニメーション画像');
      optimizations.push('静止画の場合はPNGまたはJPEGへの変換を推奨');
      break;
    
    default:
      recommendations.push('不明な形式');
  }

  return {
    format: extension,
    recommendations,
    optimizations
  };
};

/**
 * 画像処理のパフォーマンス予測
 */
export const predictProcessingTime = (
  fileSize: number,
  analysisType: string = 'describe'
): {
  estimatedSeconds: number;
  complexity: 'low' | 'medium' | 'high';
  factors: string[];
} => {
  const factors: string[] = [];
  let baseTime = 2; // 基本処理時間（秒）
  let complexity: 'low' | 'medium' | 'high' = 'low';

  // ファイルサイズによる影響
  const sizeMB = fileSize / (1024 * 1024);
  if (sizeMB > 5) {
    baseTime += sizeMB * 0.5;
    complexity = 'high';
    factors.push('大きなファイルサイズ');
  } else if (sizeMB > 2) {
    baseTime += sizeMB * 0.2;
    complexity = 'medium';
    factors.push('中程度のファイルサイズ');
  }

  // 分析タイプによる影響
  switch (analysisType) {
    case 'ocr':
      baseTime += 3;
      complexity = complexity === 'low' ? 'medium' : 'high';
      factors.push('OCR処理（文字認識）');
      break;
    
    case 'detect_objects':
      baseTime += 2;
      complexity = complexity === 'low' ? 'medium' : complexity;
      factors.push('オブジェクト検出');
      break;
    
    case 'classify':
      baseTime += 1;
      factors.push('画像分類');
      break;
    
    default:
      factors.push('基本的な画像分析');
  }

  return {
    estimatedSeconds: Math.ceil(baseTime),
    complexity,
    factors
  };
};

/**
 * 分析結果の信頼度検証
 */
export const validateAnalysisConfidence = (confidence: number): {
  isReliable: boolean;
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  recommendation: string;
} => {
  let level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  let recommendation: string;
  let isReliable: boolean;

  if (confidence >= 0.9) {
    level = 'very_high';
    recommendation = '結果は非常に信頼できます';
    isReliable = true;
  } else if (confidence >= 0.7) {
    level = 'high';
    recommendation = '結果は信頼できます';
    isReliable = true;
  } else if (confidence >= 0.5) {
    level = 'medium';
    recommendation = '結果は妥当ですが、確認することを推奨します';
    isReliable = true;
  } else if (confidence >= 0.3) {
    level = 'low';
    recommendation = '結果の信頼度が低いため、再分析を検討してください';
    isReliable = false;
  } else {
    level = 'very_low';
    recommendation = '結果の信頼度が非常に低いため、他の方法を試してください';
    isReliable = false;
  }

  return { isReliable, level, recommendation };
};

/**
 * 画像品質の自動評価
 */
export const assessImageQuality = (metadata: {
  size: number;
  format: string;
  width?: number;
  height?: number;
}): {
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // ファイルサイズチェック
  const sizeMB = metadata.size / (1024 * 1024);
  if (sizeMB < 0.1) {
    score -= 20;
    issues.push('ファイルサイズが小さすぎる可能性');
    suggestions.push('より高解像度の画像を使用することを推奨');
  } else if (sizeMB > 10) {
    score -= 10;
    issues.push('ファイルサイズが大きい');
    suggestions.push('圧縮を検討してください');
  }

  // 解像度チェック（利用可能な場合）
  if (metadata.width && metadata.height) {
    const totalPixels = metadata.width * metadata.height;
    
    if (totalPixels < 100000) { // 約300x300未満
      score -= 25;
      issues.push('解像度が低い');
      suggestions.push('より高解像度の画像を使用してください');
    } else if (totalPixels > 25000000) { // 約5000x5000以上
      score -= 5;
      issues.push('解像度が非常に高い');
      suggestions.push('処理時間短縮のため適度な解像度に調整を検討');
    }
  }

  // 形式チェック
  const format = metadata.format.toLowerCase();
  if (format === 'gif') {
    score -= 15;
    issues.push('GIF形式は分析に適さない場合がある');
    suggestions.push('静止画の場合はJPEGまたはPNG形式を推奨');
  } else if (format === 'webp') {
    score += 5;
    suggestions.push('WebP形式は効率的です');
  }

  // 品質レベルの決定
  let quality: 'poor' | 'fair' | 'good' | 'excellent';
  if (score >= 90) {
    quality = 'excellent';
  } else if (score >= 70) {
    quality = 'good';
  } else if (score >= 50) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }

  return {
    quality,
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions
  };
};