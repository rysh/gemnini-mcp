import { describe, it, expect } from '@jest/globals';
import { 
  GeminiAnalysisConfigSchema,
  ImageAnalysisOptionsSchema,
  PerformanceConfigSchema,
  AnalyzeImageToolSchema,
  BatchProcessImagesToolSchema,
  GeminiMCPError,
  ErrorCode
} from '../src/types.js';

describe('Type Schemas', () => {
  describe('GeminiAnalysisConfigSchema', () => {
    it('デフォルト値で正常にパースできる', () => {
      const config = GeminiAnalysisConfigSchema.parse({});
      
      expect(config.model).toBe('gemini-2.5-pro');
      expect(config.temperature).toBe(0.7);
      expect(config.maxOutputTokens).toBe(2048);
      expect(config.language).toBe('ja');
    });

    it('有効な値でパースできる', () => {
      const input = {
        model: 'gemini-1.5-pro',
        temperature: 0.5,
        maxOutputTokens: 1024,
        language: 'en' as const
      };
      
      const config = GeminiAnalysisConfigSchema.parse(input);
      expect(config).toEqual(input);
    });

    it('無効なtemperature値でエラーになる', () => {
      expect(() => {
        GeminiAnalysisConfigSchema.parse({ temperature: 1.5 });
      }).toThrow();
      
      expect(() => {
        GeminiAnalysisConfigSchema.parse({ temperature: -0.1 });
      }).toThrow();
    });

    it('無効な言語でエラーになる', () => {
      expect(() => {
        GeminiAnalysisConfigSchema.parse({ language: 'fr' });
      }).toThrow();
    });
  });

  describe('ImageAnalysisOptionsSchema', () => {
    it('デフォルト値で正常にパースできる', () => {
      const options = ImageAnalysisOptionsSchema.parse({});
      
      expect(options.analysisType).toBe('describe');
      expect(options.detailLevel).toBe('standard');
      expect(options.includeConfidence).toBe(false);
      expect(options.extractColors).toBe(false);
    });

    it('すべてのオプションを有効にできる', () => {
      const input = {
        analysisType: 'ocr' as const,
        detailLevel: 'detailed' as const,
        includeConfidence: true,
        extractColors: true,
        detectFaces: true,
        readQRCodes: true,
        includeMetadata: true
      };
      
      const options = ImageAnalysisOptionsSchema.parse(input);
      expect(options).toEqual(input);
    });

    it('無効な分析タイプでエラーになる', () => {
      expect(() => {
        ImageAnalysisOptionsSchema.parse({ analysisType: 'invalid' });
      }).toThrow();
    });
  });

  describe('PerformanceConfigSchema', () => {
    it('デフォルト値で正常にパースできる', () => {
      const config = PerformanceConfigSchema.parse({});
      
      expect(config.maxImageSize).toBe(10);
      expect(config.maxBatchSize).toBe(10);
      expect(config.parallelProcessing).toBe(true);
      expect(config.analysisTimeout).toBe(30);
      expect(config.cacheResults).toBe(true);
    });

    it('負の値でエラーになる', () => {
      expect(() => {
        PerformanceConfigSchema.parse({ maxImageSize: -1 });
      }).toThrow();
      
      expect(() => {
        PerformanceConfigSchema.parse({ analysisTimeout: 0 });
      }).toThrow();
    });
  });

  describe('Tool Schemas', () => {
    describe('AnalyzeImageToolSchema', () => {
      it('必須パラメーターのみでパースできる', () => {
        const params = AnalyzeImageToolSchema.parse({
          image_path: '/path/to/image.jpg'
        });
        
        expect(params.image_path).toBe('/path/to/image.jpg');
      });

      it('すべてのパラメーターでパースできる', () => {
        const input = {
          image_path: '/path/to/image.jpg',
          analysis_type: 'ocr' as const,
          detail_level: 'detailed' as const,
          language: 'en' as const,
          model: 'gemini-1.5-pro',
          temperature: 0.5
        };
        
        const params = AnalyzeImageToolSchema.parse(input);
        expect(params).toEqual(input);
      });

      it('image_pathが必須', () => {
        expect(() => {
          AnalyzeImageToolSchema.parse({});
        }).toThrow();
      });
    });

    describe('BatchProcessImagesToolSchema', () => {
      it('必須パラメーターのみでパースできる', () => {
        const params = BatchProcessImagesToolSchema.parse({
          directory_path: '/path/to/images'
        });
        
        expect(params.directory_path).toBe('/path/to/images');
      });

      it('オプションパラメーターも含めてパースできる', () => {
        const input = {
          directory_path: '/path/to/images',
          file_pattern: '*.jpg',
          max_files: 50
        };
        
        const params = BatchProcessImagesToolSchema.parse(input);
        expect(params).toEqual(input);
      });
    });
  });
});

describe('GeminiMCPError', () => {
  it('エラーコードとメッセージで作成できる', () => {
    const error = new GeminiMCPError(
      ErrorCode.GEMINI_AUTH_ERROR,
      'Authentication failed'
    );
    
    expect(error.code).toBe(ErrorCode.GEMINI_AUTH_ERROR);
    expect(error.message).toBe('Authentication failed');
    expect(error.name).toBe('GeminiMCPError');
  });

  it('詳細情報を含めて作成できる', () => {
    const details = { retryable: true, httpStatus: 401 };
    const error = new GeminiMCPError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      details
    );
    
    expect(error.details).toEqual(details);
  });

  it('Error クラスを継承している', () => {
    const error = new GeminiMCPError(
      ErrorCode.FILE_NOT_FOUND,
      'File not found'
    );
    
    expect(error instanceof Error).toBe(true);
    expect(error instanceof GeminiMCPError).toBe(true);
  });
});