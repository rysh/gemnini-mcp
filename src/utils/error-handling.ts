// エラーハンドリングの統一化
import { GeminiMCPError, ErrorCode } from '../types.js';

/**
 * MCPレスポンス形式でエラーを返す
 */
export const createErrorResponse = (error: unknown) => {
  if (error instanceof GeminiMCPError) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: true,
            code: error.code,
            message: error.message,
            details: error.details
          }, null, 2)
        }
      ]
    };
  }

  // 予期しないエラー
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: true,
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }, null, 2)
      }
    ]
  };
};

/**
 * 成功レスポンスを作成
 */
export const createSuccessResponse = (data: unknown) => {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
};

/**
 * 高階関数：エラーハンドリング付きでツールハンドラーをラップ
 */
export const withErrorHandling = <T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) => {
  return async (...args: T) => {
    try {
      const result = await handler(...args);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
};

/**
 * エラーファクトリー関数群
 */
export const createGeminiErrors = {
  authenticationFailed: (details?: Record<string, unknown>) =>
    new GeminiMCPError(
      ErrorCode.GEMINI_AUTH_ERROR,
      'Gemini API認証に失敗しました',
      details
    ),

  rateLimitExceeded: (details?: Record<string, unknown>) =>
    new GeminiMCPError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'レート制限に達しました',
      details
    ),

  analysisTimeout: (timeout: number, details?: Record<string, unknown>) =>
    new GeminiMCPError(
      ErrorCode.ANALYSIS_TIMEOUT,
      `分析がタイムアウトしました (${timeout}ms)`,
      { timeout, ...details }
    ),

  fileNotFound: (filePath: string, details?: Record<string, unknown>) =>
    new GeminiMCPError(
      ErrorCode.FILE_NOT_FOUND,
      `ファイルが見つかりません: ${filePath}`,
      { filePath, ...details }
    ),

  imageTooLarge: (actualSize: number, maxSize: number, filePath?: string) =>
    new GeminiMCPError(
      ErrorCode.IMAGE_TOO_LARGE,
      `画像サイズが上限を超えています: ${actualSize} bytes (上限: ${maxSize} bytes)`,
      { actualSize, maxSize, filePath }
    ),

  invalidImageFormat: (filePath: string, supportedFormats: string[]) =>
    new GeminiMCPError(
      ErrorCode.INVALID_IMAGE_FORMAT,
      `サポートされていない画像形式: ${filePath}`,
      { filePath, supportedFormats }
    ),

  networkError: (message: string, details?: Record<string, unknown>) =>
    new GeminiMCPError(
      ErrorCode.NETWORK_ERROR,
      `ネットワークエラー: ${message}`,
      details
    ),
};

/**
 * 子プロセスのエラーからGeminiMCPErrorを生成
 */
export const mapChildProcessError = (
  stderr: string,
  stdout: string,
  code: number | null
): GeminiMCPError => {
  // エラーメッセージからエラータイプを判定
  if (stderr.includes('Authentication failed') || stderr.includes('Unauthorized')) {
    return createGeminiErrors.authenticationFailed({ stderr, stdout, code });
  }
  
  if (stderr.includes('Rate limit') || stderr.includes('quota')) {
    return createGeminiErrors.rateLimitExceeded({ stderr, stdout, code });
  }
  
  return createGeminiErrors.networkError(
    `Gemini CLI実行エラー (code: ${code})`,
    { stderr, stdout, code }
  );
};

/**
 * プロセスエラーからGeminiMCPErrorを生成
 */
export const mapProcessError = (error: Error): GeminiMCPError => {
  if (error.message.includes('timeout')) {
    return createGeminiErrors.analysisTimeout(
      0, // タイムアウト値は呼び出し元で設定
      { originalError: error.message }
    );
  }
  
  return createGeminiErrors.networkError(
    `プロセス実行エラー: ${error.message}`,
    { originalError: error.message }
  );
};

/**
 * ファイルシステムエラーからGeminiMCPErrorを生成
 */
export const mapFileSystemError = (
  error: unknown,
  filePath: string
): GeminiMCPError => {
  if (error instanceof GeminiMCPError) {
    return error;
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
    return createGeminiErrors.fileNotFound(filePath, { originalError: errorMessage });
  }
  
  return createGeminiErrors.networkError(
    `ファイルアクセスエラー: ${errorMessage}`,
    { filePath, originalError: errorMessage }
  );
};

/**
 * エラーログ出力（デバッグ用）
 */
export const logError = (error: unknown, context?: string) => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : '';
  
  if (error instanceof GeminiMCPError) {
    console.error(`${timestamp}${contextStr} GeminiMCPError:`, {
      code: error.code,
      message: error.message,
      details: error.details
    });
  } else if (error instanceof Error) {
    console.error(`${timestamp}${contextStr} Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } else {
    console.error(`${timestamp}${contextStr} Unknown error:`, error);
  }
};

/**
 * エラーの重要度を判定
 */
export const getErrorSeverity = (error: unknown): 'low' | 'medium' | 'high' | 'critical' => {
  if (error instanceof GeminiMCPError) {
    switch (error.code) {
      case ErrorCode.GEMINI_AUTH_ERROR:
        return 'critical';
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 'high';
      case ErrorCode.ANALYSIS_TIMEOUT:
        return 'medium';
      case ErrorCode.FILE_NOT_FOUND:
      case ErrorCode.INVALID_IMAGE_FORMAT:
        return 'low';
      default:
        return 'medium';
    }
  }
  
  return 'medium';
};