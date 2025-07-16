import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import { GeminiClient } from '../src/gemini-client.js';
import { 
  GeminiAnalysisConfig, 
  ImageAnalysisOptions
} from '../src/types.js';

// child_processモジュールをモック
jest.mock('child_process');

// ファイル操作ユーティリティをモック
jest.mock('../src/utils/file.js', () => ({
  validateImageFile: jest.fn(),
  extractBasicImageMetadata: jest.fn()
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('GeminiClient', () => {
  let client: GeminiClient;
  let mockChildProcess: any;
  
  const defaultConfig: GeminiAnalysisConfig = {
    model: 'gemini-2.5-pro',
    temperature: 0.7,
    maxOutputTokens: 2048,
    language: 'ja'
  };

  const defaultOptions: ImageAnalysisOptions = {
    analysisType: 'describe',
    detailLevel: 'standard',
    includeConfidence: false,
    extractColors: false,
    detectFaces: false,
    readQRCodes: false,
    includeMetadata: true
  };

  const testImagePath = '/path/to/test.jpg';

  beforeEach(() => {
    // モックの child process オブジェクト
    mockChildProcess = {
      stdout: {
        on: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn()
    };

    mockSpawn.mockReturnValue(mockChildProcess);
    client = new GeminiClient(defaultConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('設定管理', () => {
    it('初期設定を正しく保持する', () => {
      const config = client.getConfig();
      expect(config).toEqual(defaultConfig);
    });

    it('設定を更新できる', () => {
      const newConfig = {
        model: 'gemini-1.5-pro',
        temperature: 0.5
      };

      client.updateConfig(newConfig);
      const updatedConfig = client.getConfig();

      expect(updatedConfig.model).toBe('gemini-1.5-pro');
      expect(updatedConfig.temperature).toBe(0.5);
      expect(updatedConfig.maxOutputTokens).toBe(2048); // 変更されていない値
      expect(updatedConfig.language).toBe('ja'); // 変更されていない値
    });
  });

  describe('analyzeImage', () => {
    it('正常に画像分析を実行する', async () => {
      // extractBasicImageMetadataをモック
      const { extractBasicImageMetadata } = require('../src/utils/file.js');
      extractBasicImageMetadata.mockResolvedValue({
        filename: 'test.jpg',
        size: 1024,
        dimensions: { width: 800, height: 600 },
        format: 'jpg',
        exif: {}
      });

      // 正常な実行をシミュレート
      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          callback('猫が写っている画像です');
        }
      });

      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          callback(0); // 成功
        }
      });

      const resultPromise = client.analyzeImage(testImagePath, defaultOptions);
      
      // プロミスが解決されるように手動でイベントをトリガー
      const stdoutCallback = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')[1];
      
      stdoutCallback('猫が写っている画像です');
      closeCallback(0);

      const result = await resultPromise;

      expect(result.description).toBe('猫が写っている画像です');
      expect(result.metadata.filename).toBe('test.jpg');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(mockSpawn).toHaveBeenCalledWith('npx', expect.arrayContaining([
        '@google-ai/generative-ai-cli',
        '--prompt', expect.stringContaining('画像に写っているものを詳しく説明してください'),
        '--file', testImagePath
      ]), expect.any(Object));
    });

    it('Gemini CLI認証エラーを正しく処理する', async () => {
      // extractBasicImageMetadataをモック
      const { extractBasicImageMetadata } = require('../src/utils/file.js');
      extractBasicImageMetadata.mockResolvedValue({
        filename: 'test.jpg',
        size: 1024,
        dimensions: { width: 800, height: 600 },
        format: 'jpg',
        exif: {}
      });
      
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          callback(1); // エラーコード
        }
      });
      
      mockChildProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          callback('Authentication failed');
        }
      });

      const resultPromise = client.analyzeImage(testImagePath, defaultOptions);
      
      // エラーイベントをトリガー
      const stderrCallback = mockChildProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];
      const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')[1];
      
      stderrCallback('Authentication failed');
      closeCallback(1);

      await expect(resultPromise).rejects.toThrow('Gemini API認証に失敗しました');
    });

    it('ネットワークエラーを正しく処理する', async () => {
      // extractBasicImageMetadataをモック
      const { extractBasicImageMetadata } = require('../src/utils/file.js');
      extractBasicImageMetadata.mockResolvedValue({
        filename: 'test.jpg',
        size: 1024,
        dimensions: { width: 800, height: 600 },
        format: 'jpg',
        exif: {}
      });

      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          callback(new Error('Network error'));
        }
      });

      const resultPromise = client.analyzeImage(testImagePath, defaultOptions);
      
      // エラーイベントをトリガー
      const errorCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'error')[1];
      errorCallback(new Error('Network error'));

      await expect(resultPromise).rejects.toThrow('プロセス実行エラー');
    });
  });

  describe('batchAnalyze', () => {
    it('複数の画像を順次処理する', async () => {
      const imagePaths = ['/path/to/image1.jpg', '/path/to/image2.jpg'];
      
      // extractBasicImageMetadataをモック
      const { extractBasicImageMetadata } = require('../src/utils/file.js');
      extractBasicImageMetadata.mockResolvedValue({
        filename: 'test.jpg',
        size: 1024,
        dimensions: { width: 800, height: 600 },
        format: 'jpg',
        exif: {}
      });

      // 各画像の分析をモック
      let callCount = 0;
      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          callCount++;
          callback(`画像${callCount}の分析結果`);
        }
      });

      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          callback(0);
        }
      });

      const resultPromise = client.batchAnalyze(imagePaths, defaultOptions);
      
      // 各画像の処理をシミュレート
      for (let i = 0; i < imagePaths.length; i++) {
        const stdoutCallback = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
        const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')[1];
        
        stdoutCallback(`画像${i + 1}の分析結果`);
        closeCallback(0);
      }

      const results = await resultPromise;

      expect(results).toHaveLength(imagePaths.length);
      expect(mockSpawn).toHaveBeenCalledTimes(imagePaths.length);
    });
  });

  describe('プロンプト生成', () => {
    it('分析タイプに応じて適切なプロンプトを生成する', async () => {
      // extractBasicImageMetadataをモック
      const { extractBasicImageMetadata } = require('../src/utils/file.js');
      extractBasicImageMetadata.mockResolvedValue({
        filename: 'test.jpg',
        size: 1024,
        dimensions: { width: 800, height: 600 },
        format: 'jpg',
        exif: {}
      });

      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') callback('結果');
      });
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') callback(0);
      });

      const ocrOptions: ImageAnalysisOptions = {
        ...defaultOptions,
        analysisType: 'ocr'
      };

      const resultPromise = client.analyzeImage(testImagePath, ocrOptions);
      
      // イベントをトリガー
      const stdoutCallback = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')[1];
      
      stdoutCallback('結果');
      closeCallback(0);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith('npx', expect.arrayContaining([
        '--prompt', expect.stringContaining('テキストを正確に読み取って抽出してください')
      ]), expect.any(Object));
    });
  });
});