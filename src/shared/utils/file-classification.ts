/**
 * File classification utilities
 * Detects test files and document types based on path patterns
 */

import type { DocumentType } from '../types/index.js';

/**
 * Test directory patterns
 * Matches common test directory names in file paths
 */
const TEST_DIR_PATTERNS = [
  /__tests__\//,
  /\/tests?\//,
  /\/spec\//,
  /\/test\//,
];

/**
 * Check if a file path represents a test file
 * Checks if the path contains "test" or "spec" in any component
 */
export function isTestFile(filePath: string): boolean {
  // Check directory patterns
  for (const pattern of TEST_DIR_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }

  // Check if filename contains "test" or "spec"
  const fileName = filePath.split('/').pop() || '';
  const lowerFileName = fileName.toLowerCase();
  
  return lowerFileName.includes('test') || lowerFileName.includes('spec');
}

/**
 * Detect document type by file extension
 */
export function detectDocumentType(filePath: string): DocumentType | null {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  
  if (!ext) return null;

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

  return typeMap[ext] || null;
}

/**
 * Classify a file path
 */
export interface FileClassification {
  isTest: boolean;
  documentType: DocumentType | null;
}

export function classifyFile(filePath: string): FileClassification {
  return {
    isTest: isTestFile(filePath),
    documentType: detectDocumentType(filePath),
  };
}
