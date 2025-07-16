// Gemini CLIとの連携クライアント
import { spawn } from 'child_process';
import { 
  GeminiAnalysisConfig, 
  ImageAnalysisOptions, 
  AnalysisResult,
  ImageMetadata,
  GeminiMCPError
} from './types.js';
import { getMaxConcurrentRequests } from './config/index.js';
import { 
  mapChildProcessError, 
  mapProcessError 
} from './utils/error-handling.js';
import { 
  validateImageFile,
  extractBasicImageMetadata,
  getFileExtension
} from './utils/file.js';
import {
  SUPPORTED_IMAGE_FORMATS,
  DEFAULT_CONFIDENCE_SCORE,
  DEFAULT_GEMINI_CONFIG
} from './constants/defaults.js';

export class GeminiClient {
  private config: GeminiAnalysisConfig;

  constructor(config: GeminiAnalysisConfig) {
    this.config = config;
  }

  async analyzeImage(
    imagePath: string, 
    options: ImageAnalysisOptions
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // 画像ファイルのバリデーションを共通ユーティリティで実行
      // 最大サイズは設定マネージャーから取得
      // await validateImageFile(imagePath, maxSizeBytes); // ここでは呼び出し元でバリデーション済み
      
      // Gemini CLIコマンド構築
      const prompt = this.buildAnalysisPrompt(options);
      const command = this.buildGeminiCommand(prompt, imagePath);
      
      // Gemini CLI実行
      const result = await this.executeGeminiCommand(command);
      
      // 結果をパース
      const analysisResult = await this.parseAnalysisResult(
        result, 
        imagePath, 
        options,
        Date.now() - startTime
      );
      
      return analysisResult;
    } catch (error) {
      if (error instanceof GeminiMCPError) {
        throw error;
      }
      
      // 予期しないエラーの場合は、エラーハンドリングユーティリティで処理
      const mappedError = mapProcessError(error instanceof Error ? error : new Error(String(error)));
      throw mappedError;
    }
  }

  async batchAnalyze(
    imagePaths: string[],
    options: ImageAnalysisOptions
  ): Promise<AnalysisResult[]> {
    const maxConcurrency = getMaxConcurrentRequests();

    const results: AnalysisResult[] = [];
    
    // 並行処理でバッチ分析
    for (let i = 0; i < imagePaths.length; i += maxConcurrency) {
      const batch = imagePaths.slice(i, i + maxConcurrency);
      const promises = batch.map(path => this.analyzeImage(path, options));
      
      const batchResults = await Promise.allSettled(promises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('バッチ分析エラー:', result.reason);
          // エラーの場合はスキップして続行
        }
      }
    }
    
    return results;
  }

  // 画像ファイルのバリデーションは共通ユーティリティを使用
  // validateImageFile関数をutils/file.tsから使用

  private buildAnalysisPrompt(options: ImageAnalysisOptions): string {
    const prompts = {
      describe: '画像に写っているものを詳しく説明してください。',
      ocr: '画像内のテキストを正確に読み取って抽出してください。',
      classify: '画像のカテゴリを分類し、タグを付けてください。',
      detect_objects: '画像内のオブジェクトを検出して一覧にしてください。'
    };
    
    let prompt = prompts[options.analysisType];
    
    // 詳細度に応じてプロンプトを調整
    switch (options.detailLevel) {
      case 'brief':
        prompt += ' 簡潔にまとめてください。';
        break;
      case 'detailed':
        prompt += ' 可能な限り詳細に分析してください。';
        break;
      default:
        // standard - デフォルトのまま
        break;
    }
    
    // 追加オプション
    if (options.includeConfidence) {
      prompt += ' 各項目について信頼度スコアも含めてください。';
    }
    
    if (options.extractColors) {
      prompt += ' 主要な色情報も分析してください。';
    }
    
    if (options.detectFaces) {
      prompt += ' 人物の顔が写っている場合は検出してください。';
    }
    
    if (options.readQRCodes) {
      prompt += ' QRコードがある場合は読み取ってください。';
    }
    
    // 言語指定
    if (this.config.language === 'en') {
      prompt = 'Please respond in English. ' + prompt;
    } else if (this.config.language === 'ja') {
      prompt = '日本語で回答してください。' + prompt;
    }
    
    return prompt;
  }

  private buildGeminiCommand(prompt: string, imagePath: string): string[] {
    const args = [
      '@google-ai/generative-ai-cli',
      '--prompt', prompt,
      '--file', imagePath
    ];
    
    // デフォルト値と異なる場合のみオプションを追加
    if (this.config.model !== DEFAULT_GEMINI_CONFIG.model) {
      args.push('--model', this.config.model);
    }
    
    if (this.config.temperature !== DEFAULT_GEMINI_CONFIG.temperature) {
      args.push('--temperature', this.config.temperature.toString());
    }
    
    if (this.config.maxOutputTokens !== DEFAULT_GEMINI_CONFIG.maxOutputTokens) {
      args.push('--max-tokens', this.config.maxOutputTokens.toString());
    }
    
    return args;
  }

  private executeGeminiCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // タイムアウトは設定マネージャーから取得すべきですが、一時的に環境変数を使用
      const timeout = parseInt(process.env.ANALYSIS_TIMEOUT || '30') * 1000;
      
      const child = spawn('npx', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          // エラーハンドリングを共通ユーティリティで実行
          reject(mapChildProcessError(stderr, stdout, code));
        }
      });
      
      child.on('error', (error) => {
        // プロセスエラーのハンドリングを共通ユーティリティで実行
        reject(mapProcessError(error));
      });
    });
  }

  private async parseAnalysisResult(
    rawResult: string,
    imagePath: string,
    options: ImageAnalysisOptions,
    processingTime: number
  ): Promise<AnalysisResult> {
    // 画像メタデータ取得
    const metadata = await this.extractImageMetadata(imagePath);
    
    // 基本的な分析結果構造
    const result: AnalysisResult = {
      description: rawResult,
      objects: [],
      text: '',
      metadata,
      confidence: 0.8, // デフォルト信頼度
      colors: [],
      processingTime
    };
    
    // 分析タイプに応じて結果をパース
    switch (options.analysisType) {
      case 'ocr':
        result.text = rawResult;
        break;
      case 'detect_objects':
        result.objects = this.extractObjectsList(rawResult);
        break;
      case 'classify':
        // 分類結果から主要カテゴリを抽出
        result.objects = this.extractCategories(rawResult);
        break;
      default:
        // describe の場合はそのまま
        break;
    }
    
    // 信頼度スコアの抽出
    if (options.includeConfidence) {
      result.confidence = this.extractConfidenceScore(rawResult);
    }
    
    // 色情報の抽出
    if (options.extractColors) {
      result.colors = this.extractColorInfo(rawResult);
    }
    
    return result;
  }

  private async extractImageMetadata(imagePath: string): Promise<ImageMetadata> {
    // 共通ユーティリティを使用してメタデータを抽出
    return await extractBasicImageMetadata(imagePath);
  }

  private extractObjectsList(text: string): string[] {
    // 簡単な正規表現でオブジェクトリストを抽出
    const lines = text.split('\n');
    const objects = lines
      .filter(line => line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/))
      .map(line => line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(item => item.length > 0);
    
    return objects;
  }

  private extractCategories(text: string): string[] {
    // カテゴリやタグを抽出する簡単な実装
    const categories = [];
    const categoryMatches = text.match(/カテゴリ[：:]\s*([^\n]+)/i);
    if (categoryMatches) {
      categories.push(...categoryMatches[1].split(/[,、]/).map(c => c.trim()));
    }
    
    const tagMatches = text.match(/タグ[：:]\s*([^\n]+)/i);
    if (tagMatches) {
      categories.push(...tagMatches[1].split(/[,、]/).map(c => c.trim()));
    }
    
    return categories;
  }

  private extractConfidenceScore(text: string): number {
    const confidenceMatch = text.match(/信頼度[：:]?\s*(\d+(?:\.\d+)?)[%％]?/);
    if (confidenceMatch) {
      const score = parseFloat(confidenceMatch[1]);
      return score > 1 ? score / 100 : score; // パーセンテージを小数に変換
    }
    return DEFAULT_CONFIDENCE_SCORE; // デフォルト値を定数から取得
  }

  private extractColorInfo(text: string): Array<{ color: string; percentage: number; rgb: [number, number, number] }> {
    // 色情報の抽出（簡単な実装）
    const colors = [];
    const colorMatches = text.match(/色[：:]([^\n]+)/i);
    
    if (colorMatches) {
      const colorText = colorMatches[1];
      const basicColors = ['赤', '青', '緑', '黄', '黒', '白', '茶', '紫', 'オレンジ'];
      
      for (const color of basicColors) {
        if (colorText.includes(color)) {
          colors.push({
            color,
            percentage: 0.1, // 仮の値
            rgb: [0, 0, 0] as [number, number, number] // 仮の値
          });
        }
      }
    }
    
    return colors;
  }

  updateConfig(newConfig: Partial<GeminiAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): GeminiAnalysisConfig {
    return { ...this.config };
  }
}