// ファイル操作ユーティリティ
import { promises as fs } from 'fs';
import { join } from 'path';
import { ImageMetadata } from '../types.js';
import { SUPPORTED_IMAGE_FORMATS } from '../constants/defaults.js';
import { createGeminiErrors, mapFileSystemError } from './error-handling.js';

/**
 * ファイルの存在確認
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * ファイルがディレクトリかどうかを確認
 */
export const isDirectory = async (filePath: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};

/**
 * ファイルサイズを取得
 */
export const getFileSize = async (filePath: string): Promise<number> => {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch (error) {
    throw mapFileSystemError(error, filePath);
  }
};

/**
 * ファイル名から拡張子を取得
 */
export const getFileExtension = (filePath: string): string => {
  return filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
};

/**
 * ファイル名（拡張子なし）を取得
 */
export const getFileName = (filePath: string): string => {
  const name = filePath.split('/').pop() || '';
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex > 0 ? name.slice(0, lastDotIndex) : name;
};

/**
 * ファイル名（拡張子付き）を取得
 */
export const getFileNameWithExtension = (filePath: string): string => {
  return filePath.split('/').pop() || '';
};

/**
 * 画像ファイルかどうかを判定
 */
export const isImageFile = (filePath: string): boolean => {
  const extension = getFileExtension(filePath);
  return SUPPORTED_IMAGE_FORMATS.includes(extension as any);
};

/**
 * サポートされている画像形式かチェック
 */
export const validateImageFormat = (filePath: string): void => {
  if (!isImageFile(filePath)) {
    throw createGeminiErrors.invalidImageFormat(filePath, [...SUPPORTED_IMAGE_FORMATS]);
  }
};

/**
 * ファイルサイズをチェック
 */
export const validateFileSize = async (filePath: string, maxSizeBytes: number): Promise<void> => {
  const size = await getFileSize(filePath);
  if (size > maxSizeBytes) {
    throw createGeminiErrors.imageTooLarge(size, maxSizeBytes, filePath);
  }
};

/**
 * ファイルの存在と形式をバリデーション
 */
export const validateImageFile = async (filePath: string, maxSizeBytes: number): Promise<void> => {
  // ファイル存在確認
  if (!(await fileExists(filePath))) {
    throw createGeminiErrors.fileNotFound(filePath);
  }

  // ディレクトリではないことを確認
  if (await isDirectory(filePath)) {
    throw createGeminiErrors.fileNotFound(filePath, { reason: 'Path is a directory' });
  }

  // 画像形式チェック
  validateImageFormat(filePath);

  // サイズチェック
  await validateFileSize(filePath, maxSizeBytes);
};

/**
 * ディレクトリ内のファイル一覧を取得
 */
export const getDirectoryFiles = async (directoryPath: string): Promise<string[]> => {
  try {
    if (!(await fileExists(directoryPath))) {
      throw createGeminiErrors.fileNotFound(directoryPath);
    }

    if (!(await isDirectory(directoryPath))) {
      throw createGeminiErrors.fileNotFound(directoryPath, { reason: 'Path is not a directory' });
    }

    const files = await fs.readdir(directoryPath);
    return files.map(file => join(directoryPath, file));
  } catch (error) {
    throw mapFileSystemError(error, directoryPath);
  }
};

/**
 * ディレクトリ内の画像ファイルを取得
 */
export const getImageFilesFromDirectory = async (
  directoryPath: string,
  pattern: string = '*',
  maxFiles?: number
): Promise<string[]> => {
  const allFiles = await getDirectoryFiles(directoryPath);
  
  // 画像ファイルのみフィルタリング
  let imageFiles = allFiles.filter(file => {
    const fileName = getFileNameWithExtension(file);
    return isImageFile(fileName);
  });

  // パターンマッチング
  if (pattern !== '*') {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');
    imageFiles = imageFiles.filter(file => {
      const fileName = getFileNameWithExtension(file);
      return regex.test(fileName);
    });
  }

  // 最大ファイル数制限
  if (maxFiles && maxFiles > 0) {
    imageFiles = imageFiles.slice(0, maxFiles);
  }

  return imageFiles;
};

/**
 * 基本的な画像メタデータを抽出
 */
export const extractBasicImageMetadata = async (filePath: string): Promise<ImageMetadata> => {
  const stat = await fs.stat(filePath);
  const fileName = getFileNameWithExtension(filePath);
  const format = getFileExtension(filePath).slice(1); // ドットを除去

  return {
    filename: fileName,
    size: stat.size,
    dimensions: { width: 0, height: 0 }, // 実際の実装では画像ライブラリを使用
    format,
    exif: {} // 実際の実装ではEXIFライブラリを使用
  };
};

/**
 * ファイルの作成日時を取得
 */
export const getFileCreationTime = async (filePath: string): Promise<Date> => {
  try {
    const stat = await fs.stat(filePath);
    return stat.birthtime;
  } catch (error) {
    throw mapFileSystemError(error, filePath);
  }
};

/**
 * ファイルの更新日時を取得
 */
export const getFileModificationTime = async (filePath: string): Promise<Date> => {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime;
  } catch (error) {
    throw mapFileSystemError(error, filePath);
  }
};

/**
 * 安全なファイルパス作成（ディレクトリトラバーサル対策）
 */
export const createSafeFilePath = (basePath: string, fileName: string): string => {
  // ディレクトリトラバーサル攻撃を防ぐ
  const sanitizedFileName = fileName.replace(/[\.\/\\:]/g, '_');
  return join(basePath, sanitizedFileName);
};

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * 複数ファイルの統計情報を取得
 */
export const getFilesStatistics = async (filePaths: string[]) => {
  const stats = {
    totalFiles: filePaths.length,
    totalSize: 0,
    averageSize: 0,
    largestFile: { path: '', size: 0 },
    smallestFile: { path: '', size: Infinity },
    extensions: new Map<string, number>()
  };

  for (const filePath of filePaths) {
    try {
      const size = await getFileSize(filePath);
      const extension = getFileExtension(filePath);

      stats.totalSize += size;

      if (size > stats.largestFile.size) {
        stats.largestFile = { path: filePath, size };
      }

      if (size < stats.smallestFile.size) {
        stats.smallestFile = { path: filePath, size };
      }

      const count = stats.extensions.get(extension) || 0;
      stats.extensions.set(extension, count + 1);
    } catch (error) {
      // エラーは無視して続行
      console.warn(`Failed to get stats for ${filePath}:`, error);
    }
  }

  stats.averageSize = stats.totalFiles > 0 ? stats.totalSize / stats.totalFiles : 0;

  return {
    ...stats,
    totalSizeFormatted: formatFileSize(stats.totalSize),
    averageSizeFormatted: formatFileSize(stats.averageSize),
    largestFileFormatted: formatFileSize(stats.largestFile.size),
    smallestFileFormatted: formatFileSize(stats.smallestFile.size)
  };
};