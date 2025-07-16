// メインMCPサーバー実装
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GeminiClient } from './gemini-client.js';
import {
  GeminiAnalysisConfig,
  ImageAnalysisOptions,
  AnalyzeImageToolSchema,
  BatchProcessImagesToolSchema,
  ConfigureGeminiSettingsToolSchema,
  AnalysisResult
} from './types.js';
import { getConfigManager } from './config/index.js';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  withErrorHandling 
} from './utils/error-handling.js';
import { 
  getImageFilesFromDirectory,
  validateImageFile
} from './utils/file.js';
import {
  AVAILABLE_GEMINI_MODELS,
  SUPPORTED_LANGUAGES,
  ANALYSIS_TYPES,
  DETAIL_LEVELS
} from './constants/defaults.js';

export class GeminiMCPServer {
  private server: McpServer;
  private geminiClient: GeminiClient;
  private configManager = getConfigManager();

  constructor() {
    // 設定マネージャーから設定を取得
    const config = this.configManager.getGeminiConfig();
    this.geminiClient = new GeminiClient(config);
    
    this.server = new McpServer({
      name: 'gemini-image-analyzer',
      version: '1.0.0',
      description: 'Claude CodeにGemini CLIの画像解析機能を統合するMCPサーバー'
    });

    this.setupTools();
  }

  private setupTools(): void {
    // 画像分析ツール
    this.server.tool(
      'analyze_image_with_gemini',
      'Gemini CLIを使用して画像を詳細分析します',
      {
        type: 'object',
        properties: {
          image_path: {
            type: 'string',
            description: '分析する画像ファイルのパス'
          },
          analysis_type: {
            type: 'string',
            enum: ANALYSIS_TYPES,
            description: '分析タイプ (describe: 説明, ocr: 文字認識, classify: 分類, detect_objects: オブジェクト検出)',
            default: 'describe'
          },
          detail_level: {
            type: 'string',
            enum: DETAIL_LEVELS,
            description: '分析の詳細度',
            default: 'standard'
          },
          language: {
            type: 'string',
            enum: SUPPORTED_LANGUAGES,
            description: '出力言語',
            default: 'ja'
          },
          model: {
            type: 'string',
            description: '使用するGeminiモデル',
            default: 'gemini-2.5-pro'
          },
          temperature: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: '創造性レベル (0.0-1.0)',
            default: 0.7
          }
        },
        required: ['image_path']
      },
      withErrorHandling(async (args) => {
        const params = AnalyzeImageToolSchema.parse(args);
        
        // 画像ファイルの事前バリデーション
        const maxSize = this.configManager.getMaxImageSizeBytes();
        await validateImageFile(params.image_path, maxSize);
        
        // 設定を一時的に更新
        const currentConfig = this.configManager.getGeminiConfig();
        const tempConfig = {
          ...currentConfig,
          ...(params.model && { model: params.model }),
          ...(params.temperature !== undefined && { temperature: params.temperature }),
          ...(params.language && { language: params.language })
        };
        
        this.geminiClient.updateConfig(tempConfig);
        
        // 分析オプションを構築
        const options = this.configManager.mergeAnalysisOptions({
          analysisType: params.analysis_type || 'describe',
          detailLevel: params.detail_level || 'standard',
          includeMetadata: true
        });
        
        return await this.geminiClient.analyzeImage(params.image_path, options);
      })
    );

    // バッチ処理ツール
    this.server.tool(
      'batch_process_images',
      '複数の画像を一括で分析処理します',
      {
        type: 'object',
        properties: {
          directory_path: {
            type: 'string',
            description: '画像が格納されているディレクトリのパス'
          },
          file_pattern: {
            type: 'string',
            description: 'ファイルパターン (例: *.jpg, *.png)',
            default: '*'
          },
          analysis_options: {
            type: 'object',
            description: '分析オプション',
            properties: {
              analysisType: {
                type: 'string',
                enum: ANALYSIS_TYPES,
                default: 'describe'
              },
              detailLevel: {
                type: 'string',
                enum: DETAIL_LEVELS,
                default: 'standard'
              }
            }
          },
          max_files: {
            type: 'number',
            description: '処理する最大ファイル数',
            minimum: 1,
            default: 10
          }
        },
        required: ['directory_path']
      },
      withErrorHandling(async (args) => {
        const params = BatchProcessImagesToolSchema.parse(args);
        
        // ディレクトリ内の画像ファイルを取得
        const imagePaths = await getImageFilesFromDirectory(
          params.directory_path,
          params.file_pattern || '*',
          params.max_files || 10
        );
        
        if (imagePaths.length === 0) {
          return {
            message: '指定されたディレクトリに画像ファイルが見つかりませんでした',
            directory: params.directory_path,
            pattern: params.file_pattern || '*'
          };
        }
        
        // 分析オプションを構築
        const options = this.configManager.mergeAnalysisOptions({
          analysisType: params.analysis_options?.analysisType || 'describe',
          detailLevel: params.analysis_options?.detailLevel || 'standard',
          includeMetadata: true
        });
        
        // バッチ分析実行
        const results = await this.geminiClient.batchAnalyze(imagePaths, options);
        
        return {
          processed_count: results.length,
          total_found: imagePaths.length,
          results
        };
      })
    );

    // 設定変更ツール
    this.server.tool(
      'configure_gemini_settings',
      'Gemini分析の設定を動的に変更します',
      {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'デフォルトのGeminiモデル',
            enum: AVAILABLE_GEMINI_MODELS
          },
          temperature: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'デフォルトの創造性レベル'
          },
          language: {
            type: 'string',
            enum: SUPPORTED_LANGUAGES,
            description: 'デフォルトの出力言語'
          },
          max_tokens: {
            type: 'number',
            minimum: 1,
            description: '最大出力トークン数'
          }
        }
      },
      withErrorHandling(async (args) => {
        const params = ConfigureGeminiSettingsToolSchema.parse(args);
        
        // 設定を更新
        const configUpdate = {
          ...(params.model && { model: params.model }),
          ...(params.temperature !== undefined && { temperature: params.temperature }),
          ...(params.language && { language: params.language }),
          ...(params.max_tokens && { maxOutputTokens: params.max_tokens })
        };
        
        this.configManager.updateGeminiConfig(configUpdate);
        const newConfig = this.configManager.getGeminiConfig();
        this.geminiClient.updateConfig(newConfig);
        
        return {
          message: '設定が正常に更新されました',
          new_config: newConfig
        };
      })
    );

    // ヘルスチェックツール
    this.server.tool(
      'health_check',
      'MCPサーバーとGemini CLIの接続状態を確認します',
      {
        type: 'object',
        properties: {}
      },
      withErrorHandling(async () => {
        // 設定の妥当性チェック
        const configValidation = this.configManager.validate();
        
        const status = {
          server_status: configValidation.valid ? 'healthy' : 'warning',
          config_summary: this.configManager.getSummary(),
          validation: configValidation,
          timestamp: new Date().toISOString()
        };
        
        return status;
      })
    );
  }


  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Gemini MCP Server started successfully');
  }

  async stop(): Promise<void> {
    await this.server.close();
  }

  // テスト用のgetterメソッド
  getServer(): McpServer {
    return this.server;
  }

  getGeminiClient(): GeminiClient {
    return this.geminiClient;
  }

  getCurrentConfig(): GeminiAnalysisConfig {
    return this.configManager.getGeminiConfig();
  }
}

// メイン実行部分
async function main(): Promise<void> {
  try {
    const server = new GeminiMCPServer();
    await server.start();
    
    // プロセス終了時の処理
    process.on('SIGINT', async () => {
      console.error('Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.error('Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
    // サーバーを実行し続ける
    await new Promise(() => {}); // 無限待機
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// このファイルが直接実行された場合のみサーバーを開始
// テスト環境では実行しない
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  main().catch(console.error);
}

export default GeminiMCPServer;