/**
 * File Scanner Service
 * 
 * Provides recursive file discovery with support for:
 * - Filtering by supported/unsupported extensions
 * - Respecting .gitignore patterns
 * - Skipping hidden directories
 * - Tracking file statistics during scanning
 */

import { promises as fs, type Dirent } from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import { createLogger } from '../../shared/logging/logger.js';
import type { DocumentType } from '../../shared/types/index.js';

const logger = createLogger('info').child('FileScannerService');

/**
 * Supported document extensions
 */
const DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.ppt',
  '.xlsx',
  '.xls',
  '.html',
  '.htm',
  '.md',
  '.markdown',
  '.txt',
  '.mp3',
  '.wav',
  '.m4a',
  '.flac',
]);

/**
 * Statistics collected during file scanning
 */
export interface ScanStatistics {
  totalFiles: number;
  supportedFiles: number;
  unsupportedFiles: number;
  unsupportedByExtension: Map<string, number>;
  skippedHidden: number;
  skippedByGitignore: number;
}

/**
 * Scanned file information
 */
export interface ScannedFile {
  path: string;
  relativePath: string;
  extension: string;
  supported: boolean;
  documentType?: DocumentType;
  isTest: boolean;
}

/**
 * Options for file scanning
 */
export interface ScanOptions {
  respectGitignore?: boolean;
  skipHiddenDirectories?: boolean;
  maxFileSize?: number; // in bytes
}

/**
 * File Scanner Service
 */
export class FileScannerService {
  constructor() {
    // No dependencies needed
  }

  /**
   * Recursively scan a directory for files
   * 
   * @param directoryPath - Root directory to scan
   * @param options - Scanning options
   * @returns Array of scanned files and statistics
   */
  async scanDirectory(
    directoryPath: string,
    options: ScanOptions = {}
  ): Promise<{ files: ScannedFile[]; statistics: ScanStatistics }> {
    const {
      respectGitignore = true,
      skipHiddenDirectories = true,
      maxFileSize = 1048576, // 1MB default
    } = options;

    logger.info('Starting directory scan', { directoryPath, options });

    // Initialize statistics
    const statistics: ScanStatistics = {
      totalFiles: 0,
      supportedFiles: 0,
      unsupportedFiles: 0,
      unsupportedByExtension: new Map(),
      skippedHidden: 0,
      skippedByGitignore: 0,
    };

    // Load .gitignore if requested
    let gitignoreFilter: Ignore | null = null;
    if (respectGitignore) {
      gitignoreFilter = await this.loadGitignore(directoryPath);
    }

    // Scan recursively
    const files: ScannedFile[] = [];
    await this.scanRecursive(
      directoryPath,
      directoryPath,
      files,
      statistics,
      gitignoreFilter,
      skipHiddenDirectories,
      maxFileSize
    );

    logger.info(
      'Directory scan completed',
      {
        totalFiles: statistics.totalFiles,
        supportedFiles: statistics.supportedFiles,
        unsupportedFiles: statistics.unsupportedFiles,
      }
    );

    return { files, statistics };
  }

  /**
   * Recursive helper for directory scanning
   */
  private async scanRecursive(
    rootPath: string,
    currentPath: string,
    files: ScannedFile[],
    statistics: ScanStatistics,
    gitignoreFilter: Ignore | null,
    skipHiddenDirectories: boolean,
    maxFileSize: number
  ): Promise<void> {
    let entries: Dirent[];

    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      logger.warn('Failed to read directory, skipping');
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      // Skip hidden files/directories if requested
      if (skipHiddenDirectories && entry.name.startsWith('.')) {
        if (entry.isDirectory()) {
          statistics.skippedHidden++;
          logger.debug('Skipping hidden directory', { path: relativePath });
        }
        continue;
      }

      // Check gitignore filter
      if (gitignoreFilter && gitignoreFilter.ignores(relativePath)) {
        statistics.skippedByGitignore++;
        logger.debug('Skipping file (gitignore)', { path: relativePath });
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively scan subdirectory
        await this.scanRecursive(
          rootPath,
          fullPath,
          files,
          statistics,
          gitignoreFilter,
          skipHiddenDirectories,
          maxFileSize
        );
      } else if (entry.isFile()) {
        // Check file size
        try {
          const stats = await fs.stat(fullPath);
          if (stats.size > maxFileSize) {
            logger.debug(
              'Skipping file (too large)',
              { path: relativePath, size: stats.size, maxFileSize }
            );
            continue;
          }
        } catch (error) {
          logger.warn('Failed to stat file');
          continue;
        }

        // Get file extension
        const ext = path.extname(fullPath).toLowerCase();
        
        // Check if document type is supported
        const supported = DOCUMENT_EXTENSIONS.has(ext);
        const documentType = supported ? this.detectDocumentType(ext) : undefined;
        const isTest = this.isTestFile(relativePath);
        
        statistics.totalFiles++;

        if (supported) {
          statistics.supportedFiles++;
        } else {
          statistics.unsupportedFiles++;
          
          // Track unsupported extensions
          const extKey = ext || '(no extension)';
          const count = statistics.unsupportedByExtension.get(extKey) || 0;
          statistics.unsupportedByExtension.set(extKey, count + 1);
        }

        files.push({
          path: fullPath,
          relativePath,
          extension: ext,
          supported,
          documentType,
          isTest,
        });
      }
    }
  }

  /**
   * Load .gitignore file from directory
   * 
   * @param directoryPath - Directory to search for .gitignore
   * @returns Ignore instance or null if not found
   */
  private async loadGitignore(directoryPath: string): Promise<Ignore | null> {
    const gitignorePath = path.join(directoryPath, '.gitignore');

    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const ig = ignore().add(content);
      logger.debug('Loaded .gitignore', { path: gitignorePath });
      return ig;
    } catch (error) {
      // .gitignore not found or not readable - this is fine
      logger.debug(
        'No .gitignore found or not readable',
        { path: gitignorePath }
      );
      return null;
    }
  }

  /**
   * Get supported files from scan results
   * 
   * @param files - Array of scanned files
   * @returns Array of supported files only
   */
  getSupportedFiles(files: ScannedFile[]): ScannedFile[] {
    return files.filter((file) => file.supported);
  }

  /**
   * Get unsupported files from scan results
   * 
   * @param files - Array of scanned files
   * @returns Array of unsupported files only
   */
  getUnsupportedFiles(files: ScannedFile[]): ScannedFile[] {
    return files.filter((file) => !file.supported);
  }

  /**
   * Detect document type by file extension
   */
  private detectDocumentType(ext: string): DocumentType {
    const typeMap: Record<string, DocumentType> = {
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.doc': 'docx',
      '.pptx': 'pptx',
      '.ppt': 'pptx',
      '.xlsx': 'xlsx',
      '.xls': 'xlsx',
      '.html': 'html',
      '.htm': 'html',
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.txt': 'text',
      '.mp3': 'audio',
      '.wav': 'audio',
      '.m4a': 'audio',
      '.flac': 'audio',
    };

    return typeMap[ext] || 'text';
  }

  /**
   * Check if a file path represents a test file
   */
  private isTestFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    return lowerPath.includes('test') || lowerPath.includes('spec');
  }
}
