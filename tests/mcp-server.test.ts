import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import GeminiMCPServer from '../src/mcp-server.js';
import { GeminiClient } from '../src/gemini-client.js';
import { resetConfigManager } from '../src/config/index.js';

// モジュールのモック
jest.mock('../src/gemini-client.js');
jest.mock('../src/utils/file.js', () => ({
  validateImageFile: jest.fn(),
  getImageFilesFromDirectory: jest.fn(),
  extractBasicImageMetadata: jest.fn()
}));

const MockedGeminiClient = GeminiClient as jest.MockedClass<typeof GeminiClient>;

describe('GeminiMCPServer', () => {
  let server: GeminiMCPServer;
  let mockGeminiClient: jest.Mocked<GeminiClient>;

  beforeEach(() => {
    // ConfigManagerをリセット
    resetConfigManager();
    
    // GeminiClientのモックインスタンスを作成
    mockGeminiClient = {
      analyzeImage: jest.fn(),
      batchAnalyze: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn()
    } as any;

    MockedGeminiClient.mockImplementation(() => mockGeminiClient);

    // 環境変数をリセット
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_TEMPERATURE;
    delete process.env.GEMINI_MAX_TOKENS;
    delete process.env.GEMINI_LANGUAGE;

    server = new GeminiMCPServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('デフォルト設定でサーバーを初期化する', () => {
      const config = server.getCurrentConfig();
      
      expect(config.model).toBe('gemini-2.5-pro');
      expect(config.temperature).toBe(0.7);
      expect(config.maxOutputTokens).toBe(2048);
      expect(config.language).toBe('ja');
    });

    it('環境変数から設定を読み込む', () => {
      // 環境変数設定前にConfigManagerをリセット
      resetConfigManager();
      
      process.env.GEMINI_MODEL = 'gemini-1.5-pro';
      process.env.GEMINI_TEMPERATURE = '0.5';
      process.env.GEMINI_MAX_TOKENS = '1024';
      process.env.GEMINI_LANGUAGE = 'en';

      const newServer = new GeminiMCPServer();
      const config = newServer.getCurrentConfig();

      expect(config.model).toBe('gemini-1.5-pro');
      expect(config.temperature).toBe(0.5);
      expect(config.maxOutputTokens).toBe(1024);
      expect(config.language).toBe('en');
    });

    it('GeminiClientを正しく初期化する', () => {
      expect(MockedGeminiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-pro',
          temperature: 0.7,
          maxOutputTokens: 2048,
          language: 'ja'
        })
      );
    });
  });

  describe('GeminiClient統合テスト', () => {
    it('画像分析が正常に動作する', async () => {
      const mockResult = {
        description: '猫が写っています',
        objects: [],
        text: '',
        metadata: {
          filename: 'test.jpg',
          size: 1024,
          dimensions: { width: 800, height: 600 },
          format: 'jpg'
        },
        confidence: 0.9,
        colors: [],
        processingTime: 1500
      };

      mockGeminiClient.analyzeImage.mockResolvedValue(mockResult);
      
      // validateImageFileをモック
      const { validateImageFile } = require('../src/utils/file.js');
      validateImageFile.mockResolvedValue(undefined);

      const geminiClient = server.getGeminiClient();
      const result = await geminiClient.analyzeImage('/path/to/test.jpg', {
        analysisType: 'describe',
        detailLevel: 'standard',
        includeConfidence: false,
        extractColors: false,
        detectFaces: false,
        readQRCodes: false,
        includeMetadata: true
      });

      expect(result.description).toContain('猫が写っています');
      expect(mockGeminiClient.analyzeImage).toHaveBeenCalledWith(
        '/path/to/test.jpg',
        expect.objectContaining({
          analysisType: 'describe',
          detailLevel: 'standard',
          includeMetadata: true
        })
      );
    });

    it('バッチ分析が正常に動作する', async () => {
      const mockResults = [
        {
          description: '画像1の分析結果',
          objects: ['オブジェクト1'],
          text: '',
          metadata: { filename: 'image1.jpg', size: 1024, dimensions: { width: 800, height: 600 }, format: 'jpg' },
          confidence: 0.9,
          colors: [],
          processingTime: 1000
        },
        {
          description: '画像2の分析結果',
          objects: ['オブジェクト2'],
          text: '',
          metadata: { filename: 'image2.png', size: 2048, dimensions: { width: 1024, height: 768 }, format: 'png' },
          confidence: 0.85,
          colors: [],
          processingTime: 1200
        }
      ];

      mockGeminiClient.batchAnalyze.mockResolvedValue(mockResults);

      const geminiClient = server.getGeminiClient();
      const result = await geminiClient.batchAnalyze([
        '/path/to/images/image1.jpg',
        '/path/to/images/image2.png'
      ], {
        analysisType: 'describe',
        detailLevel: 'standard',
        includeConfidence: false,
        extractColors: false,
        detectFaces: false,
        readQRCodes: false,
        includeMetadata: true
      });
      
      expect(result.length).toBe(2);
      expect(result[0].description).toBe('画像1の分析結果');
      expect(mockGeminiClient.batchAnalyze).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('image1.jpg'),
          expect.stringContaining('image2.png')
        ]),
        expect.objectContaining({
          analysisType: 'describe',
          detailLevel: 'standard'
        })
      );
    });

    it('エラーを適切に処理する', async () => {
      mockGeminiClient.analyzeImage.mockRejectedValue(
        new Error('分析に失敗しました')
      );
      
      // validateImageFileをモック
      const { validateImageFile } = require('../src/utils/file.js');
      validateImageFile.mockResolvedValue(undefined);

      const geminiClient = server.getGeminiClient();
      
      await expect(geminiClient.analyzeImage('/path/to/invalid.jpg', {
        analysisType: 'describe',
        detailLevel: 'standard',
        includeConfidence: false,
        extractColors: false,
        detectFaces: false,
        readQRCodes: false,
        includeMetadata: true
      })).rejects.toThrow('分析に失敗しました');
    });
  });

  describe('server management', () => {
    it('MCPサーバーインスタンスを取得できる', () => {
      const mcpServer = server.getServer();
      expect(mcpServer).toBeDefined();
    });

    it('GeminiClientインスタンスを取得できる', () => {
      const geminiClient = server.getGeminiClient();
      expect(geminiClient).toBeDefined();
      expect(geminiClient).toBe(mockGeminiClient);
    });

    it('現在の設定を取得できる', () => {
      const config = server.getCurrentConfig();
      expect(config).toEqual(
        expect.objectContaining({
          model: 'gemini-2.5-pro',
          temperature: 0.7,
          maxOutputTokens: 2048,
          language: 'ja'
        })
      );
    });
  });

  describe('設定更新テスト', () => {
    it('GeminiClientの設定更新が正しく動作する', () => {
      const geminiClient = server.getGeminiClient();
      
      geminiClient.updateConfig({
        model: 'gemini-1.5-pro',
        temperature: 0.3,
        language: 'en'
      });
      
      expect(mockGeminiClient.updateConfig).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        temperature: 0.3,
        language: 'en'
      });
    });
  });
});